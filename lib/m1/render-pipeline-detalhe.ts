import sharp from 'sharp'
import { put } from '@vercel/blob'
import { nanoid } from 'nanoid'
import { brandM1 } from '@/lib/brand/m1.brand'
import type { M1RenderInput } from './schema'
import { getTemplate } from './templates'
import { renderPipelineA } from './render-pipeline-a'

// Orquestrador Detalhe Tecido SPLIT (sofá):
// 1. Roda Pipeline A 2× (close + zoom) — Step 1 (swatch) único graças ao cache LRU.
// 2. Cada metade renderiza em 1080×1080, é cortada para 540×1080 (centro).
// 3. Sharp compõe lado a lado em canvas 1080×1080 (sem divisor visual).
// 4. Output: WEBP 1080×1080.
//
// IMPORTANTE: Detalhe Tecido cadeira (variant=simple) NÃO passa por aqui —
// é renderizado direto via renderPipelineA pelo orquestrador render.ts.

export async function renderPipelineDetalhe(input: M1RenderInput): Promise<string> {
  const template = getTemplate(input.movel, input.tipoFoto, input.set)
  if (template.variant !== 'split') {
    throw new Error(
      `renderPipelineDetalhe requer template variant=split (recebido: ${template.variant} para ${template.id})`
    )
  }

  const halfDims = brandM1.dimensions.detalheHalf
  const fullDims = brandM1.dimensions.final

  const [closeResult, zoomResult] = await Promise.all([
    renderPipelineA(input, {
      overrideTemplate: {
        imagePath: template.imageClosePath,
        maskPath: template.maskClosePath,
      },
      detalheVariant: 'close',
      returnBufferOnly: true,
    }),
    renderPipelineA(input, {
      overrideTemplate: {
        imagePath: template.imageZoomPath,
        maskPath: template.maskZoomPath,
      },
      detalheVariant: 'zoom',
      returnBufferOnly: true,
    }),
  ])
  if (closeResult.kind !== 'buffer' || zoomResult.kind !== 'buffer') {
    throw new Error('Pipeline Detalhe esperava buffers das duas metades')
  }

  // Corte central 540×1080 de cada metade.
  const closeHalf = await cropCenter(closeResult.buffer, halfDims, fullDims)
  const zoomHalf = await cropCenter(zoomResult.buffer, halfDims, fullDims)

  // Compositing side-by-side em canvas 1080×1080, sem divisor visual.
  const composite = await sharp({
    create: {
      width: fullDims.width,
      height: fullDims.height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: closeHalf, left: 0, top: 0 },
      { input: zoomHalf, left: halfDims.width, top: 0 },
    ])
    .webp({ quality: 90 })
    .toBuffer()

  const blob = await put(`m1/${nanoid()}.webp`, composite, {
    access: 'public',
    contentType: 'image/webp',
  })
  return blob.url
}

async function cropCenter(
  buffer: Buffer,
  target: { width: number; height: number },
  source: { width: number; height: number }
): Promise<Buffer> {
  const left = Math.max(0, Math.floor((source.width - target.width) / 2))
  const top = Math.max(0, Math.floor((source.height - target.height) / 2))
  return sharp(buffer)
    .extract({ left, top, width: target.width, height: target.height })
    .toBuffer()
}
