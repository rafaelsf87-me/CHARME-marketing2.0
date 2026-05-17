import sharp from 'sharp'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { brandM3 } from '@/lib/brand/m3.brand'
import type { M3Layers } from './types'
import {
  buildLayoutDesktopTree,
  LAYOUT_DESKTOP_DIMENSIONS,
  ICONE_CARD_POSICOES_DESKTOP,
  ICONE_CARD_SIZE_DESKTOP,
} from './templates/atual-maio26/layout-desktop'
import {
  buildLayoutMobileTree,
  LAYOUT_MOBILE_DIMENSIONS,
  ICONE_CARD_POSICOES_MOBILE,
  ICONE_CARD_SIZE_MOBILE,
} from './templates/atual-maio26/layout-mobile'

// ─── Fontes Montserrat (3 pesos estáticos — Satori não suporta variable) ─────

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts')
type WeightSlot = { weight: 600 | 700 | 800; file: string; data: Buffer | null }
const FONT_SLOTS: WeightSlot[] = [
  { weight: 600, file: 'Montserrat-SemiBold.ttf', data: null },
  { weight: 700, file: 'Montserrat-Bold.ttf', data: null },
  { weight: 800, file: 'Montserrat-ExtraBold.ttf', data: null },
]

async function getMontserratFonts(): Promise<Array<{ name: 'Montserrat'; data: Buffer; weight: 600 | 700 | 800; style: 'normal' }>> {
  await Promise.all(
    FONT_SLOTS.map(async (slot) => {
      if (!slot.data) slot.data = await fs.readFile(path.join(FONT_DIR, slot.file))
    }),
  )
  return FONT_SLOTS.map((s) => ({ name: 'Montserrat', data: s.data!, weight: s.weight, style: 'normal' }))
}

// ─── BG gradient via Sharp ───────────────────────────────────────────────────

interface BgSpec {
  width: number
  height: number
  primary: string
  secondary: string
  accent: string
  // 'desktop' = linear esquerda→direita; 'mobile' = diagonal.
  direction: 'desktop' | 'mobile'
}

async function renderBackgroundGradient(spec: BgSpec): Promise<Buffer> {
  const { width, height, primary, secondary, accent, direction } = spec
  // Linear gradient via SVG embeddado em Sharp. Sharp lê SVG e converte
  // pra raster preservando o gradient.
  const isDesktop = direction === 'desktop'
  const x2 = isDesktop ? '100%' : '100%'
  const y2 = isDesktop ? '0%' : '100%'
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="${x2}" y2="${y2}">
      <stop offset="0%" stop-color="${secondary}"/>
      <stop offset="50%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
</svg>
  `.trim()
  return sharp(Buffer.from(svg)).png().toBuffer()
}

// ─── Satori → PNG ────────────────────────────────────────────────────────────

async function renderSatoriOverlay(tree: unknown, width: number, height: number): Promise<Buffer> {
  const fonts = await getMontserratFonts()
  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width,
    height,
    fonts,
  })
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: 'rgba(0,0,0,0)',
    font: { loadSystemFonts: false },
  })
  return Buffer.from(resvg.render().asPng())
}

// ─── Helpers de composite ────────────────────────────────────────────────────

// Redimensiona um PNG mantendo aspect ratio dentro de um box w×h e retorna
// o Buffer + offsets pra centralizar dentro do box.
async function fitInside(
  buf: Buffer,
  boxW: number,
  boxH: number,
): Promise<{ buf: Buffer; offsetX: number; offsetY: number }> {
  const resized = await sharp(buf)
    .resize(boxW, boxH, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer()
  const meta = await sharp(resized).metadata()
  const w = meta.width ?? boxW
  const h = meta.height ?? boxH
  return {
    buf: resized,
    offsetX: Math.round((boxW - w) / 2),
    offsetY: Math.round((boxH - h) / 2),
  }
}

async function resizeFit(buf: Buffer, w: number, h: number): Promise<Buffer> {
  return sharp(buf).resize(w, h, { fit: 'inside', withoutEnlargement: false }).png().toBuffer()
}

async function resizeExact(buf: Buffer, w: number, h: number): Promise<Buffer> {
  return sharp(buf).resize(w, h, { fit: 'inside' }).png().toBuffer()
}

// ─── Composite Desktop ────────────────────────────────────────────────────────

// Posições do título e da atriz no canvas desktop (área alvo conforme SPEC).
const TITULO_DESKTOP = { x: 80, y: 80, w: 600, h: 370 }
const ATRIZ_DESKTOP = { x: 1480, y: 20, w: 440, h: 520 }

export async function composeDesktop(layers: M3Layers): Promise<Buffer> {
  const { width, height } = LAYOUT_DESKTOP_DIMENSIONS

  // 1. BG gradient
  const bg = await renderBackgroundGradient({
    width,
    height,
    primary: layers.bg.primary,
    secondary: layers.bg.secondary,
    accent: layers.bg.accent,
    direction: 'desktop',
  })

  // 2. Overlay Satori (waves + card + textos + círculo + footer)
  const tree = buildLayoutDesktopTree({
    cores: layers.bg,
    textos: layers.textos,
    condicoes: layers.condicoes,
  })
  const overlay = await renderSatoriOverlay(tree, width, height)

  // 3. Camadas de composite em ordem z (back → front):
  const composites: sharp.OverlayOptions[] = []

  // 3a. Satori overlay (camada estrutural)
  composites.push({ input: overlay, top: 0, left: 0 })

  // 3b. Decorações back (fundo)
  for (const d of layers.decoracoesPngs.filter((x) => x.layer === 'back')) {
    const fitted = await fitInside(d.buffer, d.w, d.h)
    composites.push({
      input: fitted.buf,
      top: d.y + fitted.offsetY,
      left: d.x + fitted.offsetX,
    })
  }

  // 3c. Ícones do card (centrados no top-half de cada quadrante)
  for (let idx = 0; idx < layers.condicoes.slice(0, 4).length; idx++) {
    const cond = layers.condicoes[idx]
    const pos = ICONE_CARD_POSICOES_DESKTOP[idx]
    if (!pos) continue
    const resized = await resizeExact(cond.iconePng, ICONE_CARD_SIZE_DESKTOP, ICONE_CARD_SIZE_DESKTOP)
    composites.push({
      input: resized,
      top: pos.cy - ICONE_CARD_SIZE_DESKTOP / 2,
      left: pos.cx - ICONE_CARD_SIZE_DESKTOP / 2,
    })
  }

  // 3d. Título (resize fit dentro de 600×370 mantendo aspect)
  const tituloResized = await resizeFit(layers.tituloPng, TITULO_DESKTOP.w, TITULO_DESKTOP.h)
  const tituloMeta = await sharp(tituloResized).metadata()
  composites.push({
    input: tituloResized,
    top: TITULO_DESKTOP.y + Math.round((TITULO_DESKTOP.h - (tituloMeta.height ?? TITULO_DESKTOP.h)) / 2),
    left: TITULO_DESKTOP.x + Math.round((TITULO_DESKTOP.w - (tituloMeta.width ?? TITULO_DESKTOP.w)) / 2),
  })

  // 3e. Atriz (resize fit dentro de 440×520, ancorada no bottom)
  const atrizResized = await resizeFit(layers.atrizPng, ATRIZ_DESKTOP.w, ATRIZ_DESKTOP.h)
  const atrizMeta = await sharp(atrizResized).metadata()
  composites.push({
    input: atrizResized,
    top: ATRIZ_DESKTOP.y + Math.max(0, ATRIZ_DESKTOP.h - (atrizMeta.height ?? ATRIZ_DESKTOP.h)),
    left: ATRIZ_DESKTOP.x + Math.round((ATRIZ_DESKTOP.w - (atrizMeta.width ?? ATRIZ_DESKTOP.w)) / 2),
  })

  // 3f. Decorações front (sobre a atriz)
  for (const d of layers.decoracoesPngs.filter((x) => x.layer === 'front')) {
    const fitted = await fitInside(d.buffer, d.w, d.h)
    composites.push({
      input: fitted.buf,
      top: d.y + fitted.offsetY,
      left: d.x + fitted.offsetX,
    })
  }

  // 4. Final composite + WEBP encode
  return sharp(bg)
    .composite(composites)
    .webp({ quality: brandM3.output.quality })
    .toBuffer()
}

// ─── Composite Mobile ────────────────────────────────────────────────────────

const TITULO_MOBILE = { x: 20, y: 50, w: 380, h: 210 }
const ATRIZ_MOBILE = { x: 480, y: 80, w: 320, h: 480 }

export async function composeMobile(layers: M3Layers): Promise<Buffer> {
  const { width, height } = LAYOUT_MOBILE_DIMENSIONS

  const bg = await renderBackgroundGradient({
    width,
    height,
    primary: layers.bg.primary,
    secondary: layers.bg.secondary,
    accent: layers.bg.accent,
    direction: 'mobile',
  })

  // Footer mobile: se vier única string, divide nas 2 linhas mais naturais.
  let footerLinhas: [string, string] | undefined
  if (layers.textos.footer) {
    const parts = layers.textos.footer.split(/,\s*/)
    if (parts.length >= 2) {
      const mid = Math.ceil(parts.length / 2)
      footerLinhas = [parts.slice(0, mid).join(', '), parts.slice(mid).join(', ')]
    } else {
      footerLinhas = [layers.textos.footer, '']
    }
  }

  const tree = buildLayoutMobileTree({
    cores: layers.bg,
    textos: layers.textos,
    condicoes: layers.condicoes,
    footerLinhas,
  })
  const overlay = await renderSatoriOverlay(tree, width, height)

  const composites: sharp.OverlayOptions[] = []
  composites.push({ input: overlay, top: 0, left: 0 })

  // Decorações back
  for (const d of layers.decoracoesPngs.filter((x) => x.layer === 'back')) {
    const fitted = await fitInside(d.buffer, d.w, d.h)
    composites.push({
      input: fitted.buf,
      top: d.y + fitted.offsetY,
      left: d.x + fitted.offsetX,
    })
  }

  // Ícones do card
  for (let idx = 0; idx < layers.condicoes.slice(0, 4).length; idx++) {
    const cond = layers.condicoes[idx]
    const pos = ICONE_CARD_POSICOES_MOBILE[idx]
    if (!pos) continue
    const resized = await resizeExact(cond.iconePng, ICONE_CARD_SIZE_MOBILE, ICONE_CARD_SIZE_MOBILE)
    composites.push({
      input: resized,
      top: pos.cy - ICONE_CARD_SIZE_MOBILE / 2,
      left: pos.cx - ICONE_CARD_SIZE_MOBILE / 2,
    })
  }

  // Título (380×210)
  const tituloResized = await resizeFit(layers.tituloPng, TITULO_MOBILE.w, TITULO_MOBILE.h)
  const tituloMeta = await sharp(tituloResized).metadata()
  composites.push({
    input: tituloResized,
    top: TITULO_MOBILE.y + Math.round((TITULO_MOBILE.h - (tituloMeta.height ?? TITULO_MOBILE.h)) / 2),
    left: TITULO_MOBILE.x + Math.round((TITULO_MOBILE.w - (tituloMeta.width ?? TITULO_MOBILE.w)) / 2),
  })

  // Atriz (320×480 com scale 0.95)
  const atrizScale = 0.95
  const atrizW = Math.round(ATRIZ_MOBILE.w * atrizScale)
  const atrizH = Math.round(ATRIZ_MOBILE.h * atrizScale)
  const atrizResized = await resizeFit(layers.atrizPng, atrizW, atrizH)
  const atrizMeta = await sharp(atrizResized).metadata()
  composites.push({
    input: atrizResized,
    top: ATRIZ_MOBILE.y + Math.max(0, ATRIZ_MOBILE.h - (atrizMeta.height ?? atrizH)),
    left: ATRIZ_MOBILE.x + Math.round((ATRIZ_MOBILE.w - (atrizMeta.width ?? atrizW)) / 2),
  })

  // Decorações front
  for (const d of layers.decoracoesPngs.filter((x) => x.layer === 'front')) {
    const fitted = await fitInside(d.buffer, d.w, d.h)
    composites.push({
      input: fitted.buf,
      top: d.y + fitted.offsetY,
      left: d.x + fitted.offsetX,
    })
  }

  return sharp(bg)
    .composite(composites)
    .webp({ quality: brandM3.output.quality })
    .toBuffer()
}
