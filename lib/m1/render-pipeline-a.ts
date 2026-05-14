import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { put } from '@vercel/blob'
import { nanoid } from 'nanoid'
import { brandM1 } from '@/lib/brand/m1.brand'
import type { M1RenderInput, M1TipoCapa, M1TipoFoto } from './schema'
import { getTemplate, type M1TemplateSimple } from './templates'
import { buildStep1Prompt, buildStep2Prompt } from './prompts'
import { callFluxKontext, callFluxKontextInpaint } from './fal-client'
import { buildCacheKey, getCachedSwatch, setCachedSwatch } from './cache'

// Pipeline A único — aplica capa no template via inpainting.
// Subfluxo Capa Lisa: pula Step 1 (sem swatch), Step 2 só com prompt de cor.
// Detalhe Tecido sofá é orquestrado em render-pipeline-detalhe.ts (split close+zoom);
// Detalhe Tecido cadeira (simple) usa este pipeline direto.

export type PipelineAOptions = {
  // Para Detalhe Tecido split: força uso de imagem/mask específicas (close ou zoom).
  overrideTemplate?: {
    imagePath: string
    maskPath: string
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
  const { imageAbs, maskAbs } = resolveTemplatePaths(template, options)

  const [templateBuffer, maskBuffer] = await Promise.all([
    readFile(imageAbs),
    readFile(maskAbs),
  ])

  // STEP 1 — capa neutra (swatch). Capa Lisa pula este passo.
  let swatchBuffer: Buffer | undefined
  if (input.tipoCapa !== 'lisa') {
    const step1Start = Date.now()
    swatchBuffer = await getOrGenerateSwatch(input.referenciaBlobUrl!, input.tipoCapa)
    console.log(`[M1] Step 1 (swatch) ${Date.now() - step1Start}ms`)
  }

  // STEP 2 — aplicar capa no template via inpainting.
  const step2Prompt = buildStep2Prompt({
    movel: input.movel,
    tipoCapa: input.tipoCapa,
    tipoFoto: input.tipoFoto,
    customization: input.customization,
    corHex: input.corHex,
    detalheVariant: options.detalheVariant,
  })

  const step2Start = Date.now()
  const finalBuffer = await callFluxKontextInpaint({
    imageBuffer: templateBuffer,
    maskBuffer,
    referenceBuffer: swatchBuffer,
    prompt: step2Prompt,
  })
  console.log(`[M1] Step 2 (inpaint) ${Date.now() - step2Start}ms`)

  // Resize final.
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
): { imageAbs: string; maskAbs: string } {
  if (options.overrideTemplate) {
    return {
      imageAbs: path.join(process.cwd(), 'public', options.overrideTemplate.imagePath),
      maskAbs: path.join(process.cwd(), 'public', options.overrideTemplate.maskPath),
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
    maskAbs: path.join(process.cwd(), 'public', simple.maskPath),
  }
}

async function getOrGenerateSwatch(
  referenciaBlobUrl: string,
  tipoCapa: Exclude<M1TipoCapa, 'lisa'>
): Promise<Buffer> {
  const cacheKey = buildCacheKey(referenciaBlobUrl, tipoCapa)
  const cached = getCachedSwatch(cacheKey)
  if (cached) {
    console.log(`[M1] Cache hit — capa neutra reutilizada`)
    return cached
  }
  console.log(`[M1] Cache miss — gerando capa neutra (${tipoCapa})`)

  const referenciaResp = await fetch(referenciaBlobUrl)
  if (!referenciaResp.ok) throw new Error('Falha ao baixar referência da capa')
  const referenciaBuffer = Buffer.from(await referenciaResp.arrayBuffer())

  const swatchBuffer = await callFluxKontext({
    imageBuffer: referenciaBuffer,
    prompt: buildStep1Prompt(tipoCapa),
  })
  setCachedSwatch(cacheKey, swatchBuffer)
  return swatchBuffer
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
