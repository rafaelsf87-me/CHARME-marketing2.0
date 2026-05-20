/**
 * V2 Compose — pipeline Sharp + Satori (V2.0.1, BUG-V2-001 fix)
 *
 * Ordem de stacking (CORRETA — gradient brand é a BASE):
 *   Layer 0: gradient-base.png (full canvas 1080×1350)
 *   Layer 1: decorações brand (sparkles, dots) — SVG via Sharp
 *   Layer 2: hero PNG (transparente) em zona delimitada — Sharp resize+composite
 *   Layer 3+: Satori overlay (texto + ícones + conectores + card + footer cta-final)
 *
 * Hero modes:
 *   - IA (transparent + rembg fallback): generateHeroV2 → produto/cena isolado
 *   - Upload: bypass LLM/IA — buffer fetched direto, MAS continua a entrar como
 *     Layer 2 (BUG-V2-004 fix — pipeline completo respeitado)
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { dispatchSubtemplate } from './subtemplates'
import { loadAllAssetUrls } from './icons'
import { buildFooterConfig } from './footer'
import { getZone, getDecorations, CANVAS } from './zones'
import { softenHeroEdges } from './hero-effects'
import { V2_CANVAS_WIDTH, V2_CANVAS_HEIGHT, type V2Plan } from './types'
import type { M2LogoOption } from '../schema'

// ─── Fontes Montserrat ──────────────────────────────────────────────────────

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts')
type FontSlot = { weight: 600 | 700 | 800; file: string; data: Buffer | null }
const FONT_SLOTS: FontSlot[] = [
  { weight: 600, file: 'Montserrat-SemiBold.ttf', data: null },
  { weight: 700, file: 'Montserrat-Bold.ttf', data: null },
  { weight: 800, file: 'Montserrat-ExtraBold.ttf', data: null },
]

async function loadMontserratFonts(): Promise<
  Array<{ name: 'Montserrat'; data: Buffer; weight: 600 | 700 | 800; style: 'normal' }>
> {
  await Promise.all(
    FONT_SLOTS.map(async (slot) => {
      if (!slot.data) slot.data = await fs.readFile(path.join(FONT_DIR, slot.file))
    }),
  )
  return FONT_SLOTS.map((s) => ({
    name: 'Montserrat',
    data: s.data!,
    weight: s.weight,
    style: 'normal',
  }))
}

// ─── Layer 0: gradient brand ────────────────────────────────────────────────

const GRADIENT_PATH = path.join(
  process.cwd(),
  'public',
  'brand',
  'm2',
  'backgrounds',
  'gradient-base.png',
)
let cachedGradient: Buffer | null = null

async function loadGradientBase(): Promise<Buffer> {
  if (cachedGradient) return cachedGradient
  const raw = await fs.readFile(GRADIENT_PATH)
  const meta = await sharp(raw).metadata()
  if (meta.width === V2_CANVAS_WIDTH && meta.height === V2_CANVAS_HEIGHT) {
    cachedGradient = raw
    return raw
  }
  cachedGradient = await sharp(raw)
    .resize(V2_CANVAS_WIDTH, V2_CANVAS_HEIGHT, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer()
  return cachedGradient
}

// ─── Layer 1: decorações brand (SVG) ────────────────────────────────────────

const OVERLAY_DIR = path.join(process.cwd(), 'public', 'brand', 'm2', 'overlays')
const overlayCache = new Map<string, Buffer>()

async function loadOverlaySvgAsPng(file: string, w: number, h: number, opacity: number): Promise<Buffer> {
  const cacheKey = `${file}|${w}|${h}|${opacity}`
  const cached = overlayCache.get(cacheKey)
  if (cached) return cached
  const raw = await fs.readFile(path.join(OVERLAY_DIR, file))
  // Render SVG → PNG no tamanho desejado; depois multiplica canal alpha
  // por `opacity` via composite com retângulo branco semi-transparente.
  const rendered = await sharp(raw, { density: 300 })
    .resize(Math.round(w), Math.round(h))
    .ensureAlpha()
    .png()
    .toBuffer()

  if (opacity >= 0.999) {
    overlayCache.set(cacheKey, rendered)
    return rendered
  }

  // Multiplica canal alpha por `opacity` usando .linear (Sharp aplica per-channel).
  // Argumento: [Rmult, Gmult, Bmult, Amult] e [Roff, Goff, Boff, Aoff].
  const dimmed = await sharp(rendered)
    .ensureAlpha()
    .linear([1, 1, 1, opacity], [0, 0, 0, 0])
    .png()
    .toBuffer()
  overlayCache.set(cacheKey, dimmed)
  return dimmed
}

// ─── Layer 2: hero em zona delimitada ───────────────────────────────────────

interface HeroLayerResult {
  buffer: Buffer
  top: number
  left: number
}

async function buildHeroLayer(heroBuffer: Buffer, zone: { x: number; y: number; w: number; h: number }): Promise<HeroLayerResult> {
  // Resize hero pra caber dentro da zona (fit:inside preserva aspect).
  const resized = await sharp(heroBuffer)
    .resize(zone.w, zone.h, { fit: 'inside', position: 'center', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  // MEL-V2-001: feather/soft-edge nas bordas pra integrar ao gradient.
  const feathered = await softenHeroEdges(resized)
  // Centraliza no rect (canvas transparente do tamanho da zone).
  const meta = await sharp(feathered).metadata()
  const offsetX = Math.round((zone.w - (meta.width ?? zone.w)) / 2)
  const offsetY = Math.round((zone.h - (meta.height ?? zone.h)) / 2)
  const padded = await sharp({
    create: {
      width: zone.w,
      height: zone.h,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: feathered, top: offsetY, left: offsetX }])
    .png()
    .toBuffer()
  return { buffer: padded, top: zone.y, left: zone.x }
}

// ─── Layer 3: Satori overlay ────────────────────────────────────────────────

async function renderSatoriOverlay(tree: React.ReactElement): Promise<Buffer> {
  const fonts = await loadMontserratFonts()
  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: V2_CANVAS_WIDTH,
    height: V2_CANVAS_HEIGHT,
    fonts,
  })
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: V2_CANVAS_WIDTH },
    background: 'rgba(0,0,0,0)',
    font: { loadSystemFonts: false },
  })
  return Buffer.from(resvg.render().asPng())
}

// ─── Compose principal ──────────────────────────────────────────────────────

export interface ComposeV2Args {
  plan: V2Plan
  heroBuffer: Buffer
  logo: M2LogoOption
}

export async function composeV2(args: ComposeV2Args): Promise<Buffer> {
  const { plan, heroBuffer, logo } = args

  const zone = getZone(plan.templateType, plan.variant)
  const decorations = getDecorations(plan.templateType, plan.variant)

  // Pre-load tudo em paralelo
  const [gradient, decorBuffers, heroLayer, assets, footerCfg] = await Promise.all([
    loadGradientBase(),
    Promise.all(
      decorations.map(async (d) => ({
        buffer: await loadOverlaySvgAsPng(d.file, d.w, d.h, d.opacity ?? 1),
        top: d.y,
        left: d.x,
      })),
    ),
    buildHeroLayer(heroBuffer, zone.heroZone),
    loadAllAssetUrls(),
    plan.templateType === 'cta-final' ? buildFooterConfig(logo) : Promise.resolve(null),
  ])

  // Render Satori tree (recebe assets + zone anchors)
  const tree = dispatchSubtemplate({
    plan,
    assets,
    zone,
    footerLogoUrl: footerCfg?.logoUrl,
    footerHandle: footerCfg?.handle,
  })
  const satoriOverlay = await renderSatoriOverlay(tree)

  // Composite final: gradient → decorações → hero → satori
  return sharp(gradient)
    .composite([
      ...decorBuffers.map((d) => ({ input: d.buffer, top: d.top, left: d.left })),
      { input: heroLayer.buffer, top: heroLayer.top, left: heroLayer.left },
      { input: satoriOverlay, top: 0, left: 0 },
    ])
    .png()
    .toBuffer()
}

// Re-export pra compose poder ser usada sem precisar conhecer Canvas interno.
export { CANVAS }
