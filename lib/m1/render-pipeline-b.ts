import sharp from 'sharp'
import { put } from '@vercel/blob'
import { nanoid } from 'nanoid'
import { brandM1 } from '@/lib/brand/m1.brand'
import type { M1RenderInput } from './schema'
import { buildElasticoPrompt, buildDetalheTecidoPrompt } from './prompts'
import { callFluxKontext } from './fal-client'

// Pipeline B: Foto Elástico + Foto Detalhe do Tecido (single-step cleanup).
export async function renderPipelineB(input: M1RenderInput): Promise<string> {
  const fotoResp = await fetch(input.referenciaBlobUrl)
  if (!fotoResp.ok) throw new Error('Falha ao baixar foto enviada')
  const fotoBuffer = Buffer.from(await fotoResp.arrayBuffer())

  const prompt =
    input.tipoFoto === 'elastico'
      ? buildElasticoPrompt(input.movel, input.customization)
      : buildDetalheTecidoPrompt(input.movel, input.customization)

  const enhancedBuffer = await callFluxKontext({
    imageBuffer: fotoBuffer,
    prompt,
  })

  const { width, height } = brandM1.dimensions.fotoElastico
  const webpBuffer = await sharp(enhancedBuffer)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .webp({ quality: 90 })
    .toBuffer()

  const blob = await put(`m1/${nanoid()}.webp`, webpBuffer, {
    access: 'public',
    contentType: 'image/webp',
  })

  return blob.url
}
