import sharp from 'sharp'
import { fal } from '@fal-ai/client'

// Tileable sintético — fallback quando o usuário NÃO fornece a foto plana do
// rolo de tecido (fotoRolo). Estratégia atual: 1 ÚNICO crop retangular grande
// da área central do assento (entre os braços, abaixo do encosto). Sem
// replicação — o crop já contém várias repetições do padrão na foto-sofá
// padrão da equipe, mais limpo que grids 2×2 ou 3×3 que reintroduziam
// repetição artificial.
//
// Coords relativas (fração da imagem; 0 = topleft, 1 = bottomright):
//   horizontal: 0.20 → 0.80 (60% da largura, evita braços)
//   vertical:   0.55 → 0.90 (35% da altura, área do assento sem encosto/pés)

const HORIZONTAL_BAND = { from: 0.2, to: 0.8 }
const VERTICAL_BAND = { from: 0.55, to: 0.9 }

export async function buildTileableFromSofa(sofaBuffer: Buffer): Promise<{
  buffer: Buffer
  cropWidth: number
  cropHeight: number
}> {
  const meta = await sharp(sofaBuffer).metadata()
  const w = meta.width
  const h = meta.height
  if (!w || !h) {
    throw new Error('Tileable: foto-sofá sem dimensões legíveis')
  }

  const left = Math.floor(HORIZONTAL_BAND.from * w)
  const right = Math.floor(HORIZONTAL_BAND.to * w)
  const top = Math.floor(VERTICAL_BAND.from * h)
  const bottom = Math.floor(VERTICAL_BAND.to * h)

  const cropWidth = Math.max(1, right - left)
  const cropHeight = Math.max(1, bottom - top)

  const buffer = await sharp(sofaBuffer)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .png()
    .toBuffer()

  return { buffer, cropWidth, cropHeight }
}

// Upload do tileable ao CDN público do fal.ai (mesma infra usada pelo
// pipeline pra subir o template).
export async function uploadTileableToFal(buffer: Buffer): Promise<string> {
  return fal.storage.upload(new Blob([new Uint8Array(buffer)], { type: 'image/png' }))
}
