/**
 * T2 Compose — Sharp + Satori pipeline final
 *
 * Pipeline:
 *   1. Carrega background do disco (`/public/brand/m2/backgrounds/...`)
 *   2. Resize/cover fit pra 1080×1350 caso difira
 *   3. Resolve imageSlots: monta Map<id, Buffer> a partir de:
 *      - source='ai_generated' → Fase 3 (stub: throw)
 *      - source='uploaded' → fetch uploadedUrl (DEC-M2-014: asset pronto)
 *      - source='static-asset' → fs.readFile staticPath
 *      - source='reused-from-pack' → CarouselAssetPack (Fase 3)
 *   4. Renderiza subtemplate via Satori → SVG → resvg → PNG transparente
 *   5. Composite na ordem: bg → satori overlay → imageSlots (sobre boxes) → footer
 *   6. Encode PNG final 1080×1350
 *
 * Política DEC-M2-014 (upload é asset pronto): branch explícito em
 * resolveImageBuffers() — uploaded NÃO vai pra IA, baixa direto.
 *
 * Política DEC-M2-015 (footer programático aposentado): footer.enabled
 * vem default false do Planner. compose.ts só renderiza footer programático
 * quando flag explícita — mantido como fallback técnico (REF-M2-003).
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
import { pickOverlaysForSlide, loadOverlayBuffer } from './overlays'
import { T2_CANVAS_HEIGHT, T2_CANVAS_WIDTH } from './types'
import type { ImageSlot, SlidePlan, TextSlot } from './types'

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

// ─── Image slots loader (DEC-M2-014: upload é asset pronto) ─────────────────

async function loadStaticAsset(staticPath: string): Promise<Buffer> {
  const cleanRel = staticPath.replace(/^\/+/, '')
  const fullPath = path.join(process.cwd(), 'public', cleanRel)
  return fs.readFile(fullPath)
}

async function fetchUploadedAsset(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`[T2] failed to fetch upload ${url}: ${res.status}`)
  }
  const arr = await res.arrayBuffer()
  return Buffer.from(arr)
}

async function resolveImageBuffers(plan: SlidePlan, override: Map<string, Buffer>): Promise<Map<string, Buffer>> {
  const result = new Map<string, Buffer>()
  for (const slot of plan.imageSlots) {
    // Override pré-carregado tem precedência (caller injeta — ex: Fase 3 com IA).
    const pre = override.get(slot.id)
    if (pre) {
      result.set(slot.id, pre)
      continue
    }
    switch (slot.source) {
      case 'uploaded':
        if (!slot.uploadedUrl) throw new Error(`[T2] slot ${slot.id} source=uploaded sem uploadedUrl`)
        result.set(slot.id, await fetchUploadedAsset(slot.uploadedUrl))
        break
      case 'static-asset':
        if (!slot.staticPath) throw new Error(`[T2] slot ${slot.id} source=static-asset sem staticPath`)
        result.set(slot.id, await loadStaticAsset(slot.staticPath))
        break
      case 'ai_generated':
        throw new Error(`[T2] slot ${slot.id} source=ai_generated — Fase 3 (assets/) não implementada`)
      case 'reused-from-pack':
        throw new Error(`[T2] slot ${slot.id} source=reused-from-pack — Fase 3 (cache) não implementada`)
    }
  }
  return result
}

async function compositeImageSlot(slot: ImageSlot, buffer: Buffer, subtemplateConfig: ReturnType<typeof getSubtemplate>['config']): Promise<sharp.OverlayOptions> {
  const def = subtemplateConfig.imageSlots.find((d) => d.id === slot.id)
  if (!def) throw new Error(`[T2] imageSlot ${slot.id} sem def no subtemplate`)
  const { box } = def

  let processed = sharp(buffer).resize(box.w, box.h, { fit: 'cover', position: 'center' })

  if (slot.treatment === 'rounded' || (slot.treatment === undefined && def.defaultTreatment === 'rounded')) {
    const radius = 16
    const maskSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${box.w}" height="${box.h}">
        <rect x="0" y="0" width="${box.w}" height="${box.h}" rx="${radius}" ry="${radius}" fill="white"/>
      </svg>
    `.trim()
    processed = processed.composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
  } else if (slot.treatment === 'circle') {
    const r = Math.min(box.w, box.h) / 2
    const maskSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${box.w}" height="${box.h}">
        <circle cx="${box.w / 2}" cy="${box.h / 2}" r="${r}" fill="white"/>
      </svg>
    `.trim()
    processed = processed.composite([{ input: Buffer.from(maskSvg), blend: 'dest-in' }])
  }

  const out = await processed.png().toBuffer()
  return { input: out, top: box.y, left: box.x }
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

// ─── Resolve fontSizes + lines pelos slots ──────────────────────────────────

interface ResolvedTextLayout {
  fontSizes: Map<string, number>
  lines: Map<string, string[]>
}

function resolveTextLayoutForSlots(
  textSlots: TextSlot[],
  textSlotDefs: ReturnType<typeof getSubtemplate>['config']['textSlots'],
): ResolvedTextLayout {
  const fontSizes = new Map<string, number>()
  const lines = new Map<string, string[]>()
  for (const slot of textSlots) {
    const def = textSlotDefs.find((d) => d.id === slot.id)
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
  /** Map de imageSlot.id → Buffer pré-resolvido. Caller pode injetar
   *  buffers (ex: IA Fase 3) que têm precedência. Se vazio, compose
   *  resolve via uploadedUrl / staticPath / pack key. */
  imageBuffers?: Map<string, Buffer>
  /** V1.1.1 (MEL-M2-017): chave de seed pros overlays determinísticos.
   *  Default = plan.slideId. Render M2 T2 injeta contextoGeral pra que
   *  carrosséis inteiros compartilhem o mesmo set de overlays. */
  overlaySeedKey?: string
}

export async function composeSlide(args: ComposeSlideArgs): Promise<Buffer> {
  const { plan } = args
  const override = args.imageBuffers ?? new Map()

  // 1. Background
  const bgConfig = getBackground(plan.backgroundId)
  const bgBuffer = await loadBackgroundBuffer(bgConfig.file)

  // 1b. Overlays decorativos brand (V1.1.1 MEL-M2-017) — sobre BG, sob satori.
  // cta-final tem footer + design embutido no PNG, pulamos overlays pra não
  // poluir o layout final.
  const overlayComposites: sharp.OverlayOptions[] = []
  if (plan.subtemplateId !== 'cta-final') {
    const placements = pickOverlaysForSlide({
      seedKey: args.overlaySeedKey ?? plan.slideId,
      slideIndex: plan.slideIndex,
    })
    for (const p of placements) {
      const buf = await loadOverlayBuffer(p)
      overlayComposites.push({ input: buf, top: p.top, left: p.left })
    }
  }

  // 2. ImageSlots resolvidos (uploads, static, pack — DEC-M2-014)
  const imageBuffers = await resolveImageBuffers(plan, override)

  // 3. Subtemplate Satori (renderiza placeholders de boxes — as imagens vão
  //    por composite Sharp depois pra fidelidade).
  const subtemplate = getSubtemplate(plan.subtemplateId)
  // BUG-M2-004 Fase 6: subtemplate pode resolver textSlotDefs dinamicamente
  // baseado no plan (ex: cover muda layout quando há image-main no plan).
  const effectiveTextSlotDefs = subtemplate.resolveTextSlotDefs
    ? subtemplate.resolveTextSlotDefs(plan)
    : subtemplate.config.textSlots
  const layout = resolveTextLayoutForSlots(plan.textSlots, effectiveTextSlotDefs)
  const tree = subtemplate.render({
    background: bgConfig,
    textSlots: plan.textSlots,
    imageSlots: plan.imageSlots,
    imageBuffers,
    resolvedFontSizes: layout.fontSizes,
    resolvedLines: layout.lines,
  })
  const subtemplateBuffer = await renderSatoriOverlay(tree)

  // 4. Composites — ordem: overlays brand → satori (texto/boxes) → imageSlots → footer
  const composites: sharp.OverlayOptions[] = []
  composites.push(...overlayComposites)
  composites.push({ input: subtemplateBuffer, top: 0, left: 0 })

  // 4a. Image slots (Sharp composite por cima do Satori overlay)
  for (const slot of plan.imageSlots) {
    const buf = imageBuffers.get(slot.id)
    if (!buf) continue
    composites.push(await compositeImageSlot(slot, buf, subtemplate.config))
  }

  // 4b. Footer programático (só se plan.footer.enabled — DEC-M2-015 default false)
  if (plan.footer.enabled) {
    const footerBuffer = await renderFooter({ logo: plan.footer.logo })
    composites.push({ input: footerBuffer, top: FOOTER_TOP, left: 0 })
  }

  // 5. Composite final + PNG encode
  return sharp(bgBuffer).composite(composites).png().toBuffer()
}
