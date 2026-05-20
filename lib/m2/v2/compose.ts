/**
 * V2 Compose — pipeline Sharp + Satori
 *
 * 1. Pre-load: ícones + conectores + (cta-final) logo footer como data URLs
 * 2. Hero buffer → resize 1080×1350 cover
 * 3. Satori renderiza React tree → SVG → resvg → PNG transparente 1080×1350
 * 4. Sharp composite: hero base + Satori overlay
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { dispatchSubtemplate } from './subtemplates'
import { loadAllAssetUrls } from './icons'
import { buildFooterConfig } from './footer'
import { V2_CANVAS_WIDTH, V2_CANVAS_HEIGHT, type V2Plan } from './types'
import type { M2LogoOption } from '../schema'

// ─── Fontes Montserrat (reusa pasta T2) ─────────────────────────────────────

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

// ─── Hero resize ────────────────────────────────────────────────────────────

async function resizeHeroToCanvas(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input).metadata()
  if (meta.width === V2_CANVAS_WIDTH && meta.height === V2_CANVAS_HEIGHT) return input
  return sharp(input)
    .resize(V2_CANVAS_WIDTH, V2_CANVAS_HEIGHT, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer()
}

// ─── Satori → PNG transparente ──────────────────────────────────────────────

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

  // 1. Pre-load assets (icons + connectors + footer logo se cta-final)
  const [assets, footerCfg] = await Promise.all([
    loadAllAssetUrls(),
    plan.templateType === 'cta-final' ? buildFooterConfig(logo) : Promise.resolve(null),
  ])

  // 2. Hero base
  const heroResized = await resizeHeroToCanvas(heroBuffer)

  // 3. Satori overlay
  const tree = dispatchSubtemplate({
    plan,
    assets,
    footerLogoUrl: footerCfg?.logoUrl,
    footerHandle: footerCfg?.handle,
  })
  const overlay = await renderSatoriOverlay(tree)

  // 4. Composite
  return sharp(heroResized)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toBuffer()
}
