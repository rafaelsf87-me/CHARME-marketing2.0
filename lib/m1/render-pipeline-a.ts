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

// Pipeline A — aplica capa no template via nano-banana-2 em UM passo.
// Estampada/Alto Relevo: foto do rolo (referenciaBlobUrl) entra direto como
// REF-2; sem swatch intermediário (Step 1 flux-pro/kontext desativado).
// Capa Lisa: sem REF-2; cor HEX descrita no prompt.
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

  // STEP único — nano-banana-2 com REF-1 = template, REF-2 = foto do rolo.
  // Capa Lisa: referenciaBlobUrl ausente; prompt traz a cor HEX.
  const step2Prompt = buildStep2Prompt({
    movel: input.movel,
    tipoCapa: input.tipoCapa,
    tipoFoto: input.tipoFoto,
    customization: input.customization,
    corHex: input.corHex,
    detalheVariant: options.detalheVariant,
  })

  const step2Start = Date.now()
  const finalBuffer = await callNanoBananaEdit({
    templateBuffer,
    referenceUrl: input.referenciaBlobUrl,
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

export type { M1TipoFoto }
