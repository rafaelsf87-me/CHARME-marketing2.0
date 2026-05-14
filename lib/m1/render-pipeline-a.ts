import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { put } from '@vercel/blob'
import { nanoid } from 'nanoid'
import { brandM1 } from '@/lib/brand/m1.brand'
import type { M1RenderInput } from './schema'
import { getTemplateById } from './templates'
import { buildStep1Prompt, buildStep2Prompt } from './prompts'
import { callFluxKontext, callFluxKontextInpaint } from './fal-client'
import { buildCacheKey, getCachedSwatch, setCachedSwatch } from './cache'

// Pipeline A: Foto Capa + Foto Ambiente (DEC-005 — 2-step + cache).
export async function renderPipelineA(input: M1RenderInput): Promise<string> {
  if (!input.cenarioId) {
    throw new Error('cenarioId obrigatório para Pipeline A')
  }

  const template = getTemplateById(input.cenarioId)
  if (!template) throw new Error(`Template não encontrado: ${input.cenarioId}`)

  const templateAbsPath = path.join(process.cwd(), 'public', template.imagePath)
  const maskAbsPath = path.join(process.cwd(), 'public', template.maskPath)

  const [templateBuffer, maskBuffer] = await Promise.all([
    readFile(templateAbsPath),
    readFile(maskAbsPath),
  ])

  const referenciaResp = await fetch(input.referenciaBlobUrl)
  if (!referenciaResp.ok) throw new Error('Falha ao baixar referência da capa')
  const referenciaBuffer = Buffer.from(await referenciaResp.arrayBuffer())

  // STEP 1 — capa neutra (com cache)
  const cacheKey = buildCacheKey(input.referenciaBlobUrl, input.tipoCapa)
  let swatchBuffer = getCachedSwatch(cacheKey)

  if (!swatchBuffer) {
    console.log(`[M1] Cache miss — gerando capa neutra (${input.tipoCapa})`)
    swatchBuffer = await callFluxKontext({
      imageBuffer: referenciaBuffer,
      prompt: buildStep1Prompt(input.tipoCapa),
    })
    setCachedSwatch(cacheKey, swatchBuffer)
  } else {
    console.log(`[M1] Cache hit — capa neutra reutilizada`)
  }

  // STEP 2 — aplicar capa neutra no template via inpainting
  // Endpoint: fal-ai/flux-kontext-lora/inpaint (resolve DEC-006).
  const step2Prompt = buildStep2Prompt({
    movel: input.movel,
    tipoCapa: input.tipoCapa,
    tipoFoto: input.tipoFoto as 'capa' | 'ambiente',
    customization: input.customization,
  })

  const finalBuffer = await callFluxKontextInpaint({
    imageBuffer: templateBuffer,
    maskBuffer,
    referenceBuffer: swatchBuffer,
    prompt: step2Prompt,
  })

  const { width, height } = brandM1.dimensions.fotoCapa
  const webpBuffer = await sharp(finalBuffer)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .webp({ quality: 90 })
    .toBuffer()

  const blob = await put(`m1/${nanoid()}.webp`, webpBuffer, {
    access: 'public',
    contentType: 'image/webp',
  })

  return blob.url
}
