/**
 * T2 Compose — Sharp + Satori pipeline final
 *
 * Pipeline:
 *   1. Carrega background do disco (`/public/brand/m2/backgrounds/...`)
 *   2. Resize/cover fit pra 1080×1350 caso difira
 *   3. Renderiza subtemplate via Satori → SVG → resvg → PNG buffer transparente
 *   4. Composite subtemplate sobre background
 *   5. Composite footer transparente nos 120px reservados
 *   6. Encode PNG final 1080×1350
 *
 * Política DEC-M2-014: quando imageSlot.source === 'uploaded', bypassa
 * `assets/` e baixa direto. Branch é tratado em `render.ts` ao construir
 * o `imageBuffers` que chega aqui.
 */

import path from 'node:path'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { getBackground } from './backgrounds/catalog'
import { getSubtemplate } from './subtemplates'
import { renderFooter } from './footer'
import { fitTextToBox } from './text-renderer'
import { T2_CANVAS_HEIGHT, T2_CANVAS_WIDTH } from './types'
import type { SlidePlan, TextSlot } from './types'

// Footer geometria (alinha com lib/m2/footer-gen.ts: FOOTER_HEIGHT=120, MARGIN_BOTTOM=40).
const FOOTER_HEIGHT = 120
const FOOTER_MARGIN_BOTTOM = 40
const FOOTER_TOP = T2_CANVAS_HEIGHT - FOOTER_MARGIN_BOTTOM - FOOTER_HEIGHT

// ─── Fontes Montserrat ──────────────────────────────────────────────────────

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts')
type WeightSlot = { weight: 600 | 700 | 800; file: string; data: Buffer | null }
const FONT_SLOTS: WeightSlot[] = [
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

// ─── Background loader ──────────────────────────────────────────────────────

async function loadBackgroundBuffer(filePath: string): Promise<Buffer> {
  // filePath vem como "/brand/m2/backgrounds/starfield-01.png". Tira leading slash.
  const cleanRel = filePath.replace(/^\/+/, '')
  const fullPath = path.join(process.cwd(), 'public', cleanRel)
  const raw = await fs.readFile(fullPath)

  // Garante 1080×1350. Se já estiver, evita reencode.
  const meta = await sharp(raw).metadata()
  if (meta.width === T2_CANVAS_WIDTH && meta.height === T2_CANVAS_HEIGHT) {
    return raw
  }
  return sharp(raw)
    .resize(T2_CANVAS_WIDTH, T2_CANVAS_HEIGHT, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer()
}

// ─── Satori → PNG transparente ──────────────────────────────────────────────

async function renderSatoriOverlay(tree: unknown): Promise<Buffer> {
  const fonts = await loadMontserratFonts()
  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: T2_CANVAS_WIDTH,
    height: T2_CANVAS_HEIGHT,
    fonts,
  })
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: T2_CANVAS_WIDTH },
    background: 'rgba(0,0,0,0)',
    font: { loadSystemFonts: false },
  })
  return Buffer.from(resvg.render().asPng())
}

// ─── Resolve fontSizes pelos slots do subtemplate ───────────────────────────

interface ResolvedTextLayout {
  fontSizes: Map<string, number>
  lines: Map<string, string[]>
}

function resolveTextLayoutForSlots(
  textSlots: TextSlot[],
  subtemplateConfig: ReturnType<typeof getSubtemplate>['config'],
): ResolvedTextLayout {
  const fontSizes = new Map<string, number>()
  const lines = new Map<string, string[]>()
  for (const slot of textSlots) {
    const def = subtemplateConfig.textSlots.find((d) => d.id === slot.id)
    if (!def) continue
    const fit = fitTextToBox({
      text: slot.content,
      box: def.box,
      fontWeight: def.fontWeight,
      fontSizeMin: def.fontSizeMin,
      fontSizeMax: def.fontSizeMax,
      lineHeight: def.lineHeight,
      maxLines: def.maxLines,
      overflowStrategy: slot.overflowStrategy ?? 'shrink',
    })
    fontSizes.set(slot.id, fit.fontSize)
    lines.set(slot.id, fit.lines)
    if (process.env.T2_DEBUG === '1') {
      console.log(
        `[t2/compose] slot=${slot.id} fontSize=${fit.fontSize} lines=${fit.lines.length} overflow=${fit.overflow}`,
      )
      for (const ln of fit.lines) console.log(`  · ${ln}`)
    }
  }
  return { fontSizes, lines }
}

// ─── composeSlide — orquestrador Sharp ──────────────────────────────────────

export interface ComposeSlideArgs {
  plan: SlidePlan
  /** Map de imageSlot.id → Buffer. Vazio na Fase 1 (sem IA). */
  imageBuffers: Map<string, Buffer>
}

export async function composeSlide(args: ComposeSlideArgs): Promise<Buffer> {
  const { plan } = args

  // 1. Background
  const bgConfig = getBackground(plan.backgroundId)
  const bgBuffer = await loadBackgroundBuffer(bgConfig.file)

  // 2. Subtemplate Satori
  const subtemplate = getSubtemplate(plan.subtemplateId)
  const layout = resolveTextLayoutForSlots(plan.textSlots, subtemplate.config)
  const tree = subtemplate.render({
    background: bgConfig,
    textSlots: plan.textSlots,
    imageSlots: plan.imageSlots,
    imageBuffers: args.imageBuffers,
    resolvedFontSizes: layout.fontSizes,
    resolvedLines: layout.lines,
  })
  const subtemplateBuffer = await renderSatoriOverlay(tree)

  // 3. Footer (se habilitado)
  const composites: sharp.OverlayOptions[] = []
  composites.push({ input: subtemplateBuffer, top: 0, left: 0 })

  if (plan.footer.enabled) {
    const footerBuffer = await renderFooter({ logo: plan.footer.logo })
    composites.push({ input: footerBuffer, top: FOOTER_TOP, left: 0 })
  }

  // 4. Composite final + PNG encode
  return sharp(bgBuffer).composite(composites).png().toBuffer()
}
