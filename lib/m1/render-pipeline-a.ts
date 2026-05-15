import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { put } from '@vercel/blob'
import { nanoid } from 'nanoid'
import { brandM1 } from '@/lib/brand/m1.brand'
import type { M1RenderInput, M1TipoFoto } from './schema'
import { getTemplate, type M1TemplateSimple } from './templates'
import { buildStep2Prompt } from './prompts'
import { callNanoBananaEdit } from './fal-client'
import { buildTileableFromSofa, uploadTileableToFal } from './tileable'

// Largura física real do sofá-padrão da equipe (foto-sofá usuário, REF-2).
// Valor fornecido por Rafael em 17/05/2026 — não estimar.
const REF_SOFA_WIDTH_CM = 180
// Largura ÚTIL entre os braços do sofá-padrão (REF-2). Usada pelo bloco
// HORIZONTAL PATTERN COLUMNS — mais preditiva que a largura total.
const REF_SOFA_INNER_WIDTH_CM = 140

// Pipeline A2 — aplica capa no template via nano-banana-2 em UM passo.
// Estampada/Alto Relevo:
//   - REF-1 = template; REF-2 = foto do sofá-padrão com a estampa (obrigatória);
//   - REF-3 = foto plana do rolo de tecido (opcional, recomendada).
// Capa Lisa: só REF-1; cor HEX descrita no prompt.
// Step 1 flux-pro/kontext permanece desativado (fallback em fal-client.ts).
// Detalhe Tecido sofá é orquestrado em render-pipeline-detalhe.ts (split close+zoom);
// Detalhe Tecido cadeira (simple) usa este pipeline direto.

export type PipelineAOptions = {
  // Para Detalhe Tecido split: força uso de imagem específica (close ou zoom).
  overrideTemplate?: {
    imagePath: string
  }
  // Refina o prompt do Step 2 para a metade close ou zoom do Detalhe Tecido.
  detalheVariant?: 'close' | 'zoom'
  // Detalhe Tecido: resize final em 540×1080 ao invés de 1080×1080.
  outputDimensions?: { width: number; height: number }
  // Detalhe Tecido pula upload e devolve buffer direto (para compositing).
  returnBufferOnly?: boolean
}

export type PipelineAResult =
  | { kind: 'url'; url: string }
  | { kind: 'buffer'; buffer: Buffer }

export async function renderPipelineA(
  input: M1RenderInput,
  options: PipelineAOptions = {}
): Promise<PipelineAResult> {
  const template = getTemplate(input.movel, input.tipoFoto, input.set)
  const { imageAbs } = resolveTemplatePaths(template, options)

  const templateBuffer = await readFile(imageAbs)

  // REF-3: foto plana do rolo (preferida) OU tileable sintético da foto-sofá
  // (fallback) quando o usuário não fornece. Capa Lisa pula isso.
  let rolloUrl: string | undefined = input.fotoRolo
  if (!rolloUrl && input.tipoCapa !== 'lisa' && input.fotoSofa) {
    const tileStart = Date.now()
    const sofaBuffer = await fetchAsBuffer(input.fotoSofa, 'foto-sofá')
    const { buffer: tileableBuffer } = await buildTileableFromSofa(sofaBuffer)
    rolloUrl = await uploadTileableToFal(tileableBuffer)
    console.log(`[M1] Tileable sintético gerado em ${Date.now() - tileStart}ms → ${rolloUrl}`)
  }

  // STEP único — nano-banana-2.
  // Capa Lisa: sem fotos; prompt traz a cor HEX.
  // Estampada/Alto Relevo: fotoSofa obrigatória (REF-2); REF-3 = rolo ou tileable sintético.
  const step2Prompt = buildStep2Prompt({
    movel: input.movel,
    tipoCapa: input.tipoCapa,
    tipoFoto: input.tipoFoto,
    customization: input.customization,
    corHex: input.corHex,
    detalheVariant: options.detalheVariant,
    temRolo: Boolean(rolloUrl),
    templateWidthCm: template.physicalWidthCm,
    refSofaWidthCm: REF_SOFA_WIDTH_CM,
    templateInnerWidthCm: template.physicalInnerWidthCm,
    refSofaInnerWidthCm: REF_SOFA_INNER_WIDTH_CM,
  })

  const step2Start = Date.now()
  const finalBuffer = await callNanoBananaEdit({
    templateBuffer,
    sofaUrl: input.fotoSofa,
    rolloUrl,
    prompt: step2Prompt,
  })
  console.log(`[M1] Step 2 (nano-banana) ${Date.now() - step2Start}ms`)

  // Resize final (nano-banana retorna 2K → downscale pra 1080 mantém qualidade).
  const { width, height } = options.outputDimensions ?? brandM1.dimensions.final
  const resized = await sharp(finalBuffer)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .toBuffer()

  if (options.returnBufferOnly) {
    return { kind: 'buffer', buffer: resized }
  }

  const webpBuffer = await sharp(resized).webp({ quality: 90 }).toBuffer()
  const blob = await put(`m1/${nanoid()}.webp`, webpBuffer, {
    access: 'public',
    contentType: 'image/webp',
  })
  return { kind: 'url', url: blob.url }
}

function resolveTemplatePaths(
  template: ReturnType<typeof getTemplate>,
  options: PipelineAOptions
): { imageAbs: string } {
  if (options.overrideTemplate) {
    return {
      imageAbs: path.join(process.cwd(), 'public', options.overrideTemplate.imagePath),
    }
  }
  if (template.variant !== 'simple') {
    throw new Error(
      'Pipeline A requer template variant=simple ou overrideTemplate explícito'
    )
  }
  const simple: M1TemplateSimple = template
  return {
    imageAbs: path.join(process.cwd(), 'public', simple.imagePath),
  }
}

// Wrapper conveniente: Pipeline A produzindo URL final (uso direto pra
// capa/ambiente/elastico/cadeira-detalhe). Detalhe Tecido sofá usa
// renderPipelineA com options.
export async function renderPipelineAToUrl(
  input: M1RenderInput,
  options: PipelineAOptions = {}
): Promise<string> {
  const result = await renderPipelineA(input, { ...options, returnBufferOnly: false })
  if (result.kind !== 'url') {
    throw new Error('Pipeline A não retornou URL')
  }
  return result.url
}

async function fetchAsBuffer(url: string, label: string): Promise<Buffer> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Falha ao baixar ${label} (${resp.status})`)
  return Buffer.from(await resp.arrayBuffer())
}

export type { M1TipoFoto }
