/**
 * V2 Hero Effects (MEL-V2-001 — soft-edge/feather)
 *
 * Aplica fade nas bordas do hero pra evitar corte abrupto sobre o gradient.
 *
 * Estratégia combinada (cobre IA transparent + Upload opaco):
 *  1. Blur no canal alpha existente (suaviza bordas do conteúdo — caso IA transparent)
 *  2. Multiplica por máscara retangular com fade nas bordas (caso Upload opaco)
 *  3. Recompõe RGBA com alpha combinado
 *
 * Custo Sharp: ~30-80ms por hero (operações in-memory).
 */

import sharp from 'sharp'

const ALPHA_BLUR_PX = 6
const EDGE_FADE_PCT = 0.05 // 5% das bordas viram fade

export async function softenHeroEdges(buffer: Buffer): Promise<Buffer> {
  const withAlpha = await sharp(buffer).ensureAlpha().png().toBuffer()
  const meta = await sharp(withAlpha).metadata()
  const w = meta.width
  const h = meta.height
  if (!w || !h) return buffer

  // 1. Alpha existente, blur — suaviza bordas do conteúdo (hero IA transparent)
  const alphaBlurred = await sharp(withAlpha)
    .extractChannel('alpha')
    .blur(ALPHA_BLUR_PX)
    .raw()
    .toBuffer()

  // 2. Edge mask retangular — fade nas bordas do canvas (hero opaco/upload)
  const fade = EDGE_FADE_PCT
  const edgeMaskSvg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lr" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="black"/>
        <stop offset="${fade}" stop-color="white"/>
        <stop offset="${1 - fade}" stop-color="white"/>
        <stop offset="1" stop-color="black"/>
      </linearGradient>
      <linearGradient id="tb" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="black"/>
        <stop offset="${fade}" stop-color="white"/>
        <stop offset="${1 - fade}" stop-color="white"/>
        <stop offset="1" stop-color="black"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#lr)"/>
  </svg>`
  const edgeMaskLR = await sharp(Buffer.from(edgeMaskSvg))
    .resize(w, h)
    .greyscale()
    .raw()
    .toBuffer()

  const edgeMaskSvgTB = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="black"/>
        <stop offset="${fade}" stop-color="white"/>
        <stop offset="${1 - fade}" stop-color="white"/>
        <stop offset="1" stop-color="black"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
  </svg>`
  const edgeMaskTB = await sharp(Buffer.from(edgeMaskSvgTB))
    .resize(w, h)
    .greyscale()
    .raw()
    .toBuffer()

  // 3. Combina pixel a pixel: alpha final = min(alpha_blurred, edgeLR × edgeTB)
  const combined = Buffer.alloc(w * h)
  for (let i = 0; i < w * h; i++) {
    const edge = Math.floor((edgeMaskLR[i] * edgeMaskTB[i]) / 255)
    combined[i] = Math.min(alphaBlurred[i], edge)
  }

  // 4. Recompõe RGBA: pega RGB do hero + alpha combinado
  const rgbRaw = await sharp(withAlpha).removeAlpha().raw().toBuffer()
  return sharp(rgbRaw, {
    raw: { width: w, height: h, channels: 3 },
  })
    .joinChannel(combined, { raw: { width: w, height: h, channels: 1 } })
    .png()
    .toBuffer()
}
