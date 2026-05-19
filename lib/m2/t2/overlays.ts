/**
 * T2 Overlays — decoração brand sutil sobre o background (V1.1.1 MEL-M2-017)
 *
 * Carrega SVGs de public/brand/m2/overlays/, escolhe 1-2 por slide via hash
 * determinístico (mesmo briefing → mesmos overlays; briefings diferentes
 * variam). Renderiza como Sharp composite layer ANTES dos textSlots, com
 * opacidade 35% pra não competir com conteúdo.
 *
 * Zonas fixas (4 cantos, dentro do safe area):
 *   Z1 top-left   (x=60-180,   y=60-180)
 *   Z2 top-right  (x=900-1020, y=60-180)
 *   Z3 bot-left   (x=60-180,   y=1100-1240)
 *   Z4 bot-right  (x=900-1020, y=1100-1240)
 */

import path from 'node:path'
import fs from 'node:fs/promises'

export type OverlayId = 'sparkle-cyan' | 'dots-pattern' | 'halo-glow' | 'line-decoration'
export type OverlayZone = 'z1' | 'z2' | 'z3' | 'z4'

interface OverlaySpec {
  id: OverlayId
  file: string
  /** Tamanho final em px no canvas 1080×1350. */
  size: { w: number; h: number }
}

const OVERLAYS: Record<OverlayId, OverlaySpec> = {
  'sparkle-cyan': { id: 'sparkle-cyan', file: 'sparkle-cyan.svg', size: { w: 120, h: 120 } },
  'dots-pattern': { id: 'dots-pattern', file: 'dots-pattern.svg', size: { w: 220, h: 220 } },
  'halo-glow': { id: 'halo-glow', file: 'halo-glow.svg', size: { w: 280, h: 280 } },
  'line-decoration': { id: 'line-decoration', file: 'line-decoration.svg', size: { w: 160, h: 50 } },
}

const ZONE_ANCHORS: Record<OverlayZone, { x: number; y: number }> = {
  z1: { x: 120, y: 120 },
  z2: { x: 960, y: 120 },
  z3: { x: 120, y: 1170 },
  z4: { x: 960, y: 1170 },
}

const OVERLAY_OPACITY = 0.35
const OVERLAYS_DIR = path.join(process.cwd(), 'public', 'brand', 'm2', 'overlays')

/** djb2 hash → uint32 estável p/ qualquer string. */
function hashString(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i)
  return h >>> 0
}

export interface OverlayPlacement {
  id: OverlayId
  zone: OverlayZone
  /** Top-left após centralizar overlay no zone anchor. */
  left: number
  top: number
  width: number
  height: number
}

/**
 * Determinístico: seed = hash(contextoGeral + slideIndex). Mesmo briefing →
 * mesmos overlays; carrosséis diferentes variam.
 */
export function pickOverlaysForSlide(args: {
  seedKey: string
  slideIndex: number
  /** Default 1-2 overlays por slide. */
  count?: 1 | 2
}): OverlayPlacement[] {
  const seed = hashString(`${args.seedKey}::${args.slideIndex}`)
  const count = args.count ?? (seed % 2 === 0 ? 1 : 2)
  const overlayIds: OverlayId[] = ['sparkle-cyan', 'dots-pattern', 'halo-glow', 'line-decoration']
  const zones: OverlayZone[] = ['z1', 'z2', 'z3', 'z4']

  const picks: OverlayPlacement[] = []
  const usedZones = new Set<OverlayZone>()

  for (let k = 0; k < count; k++) {
    const overlayIdx = (seed + k * 7) % overlayIds.length
    const overlayId = overlayIds[overlayIdx]
    // Próxima zona não usada.
    let zone: OverlayZone | null = null
    for (let z = 0; z < zones.length; z++) {
      const candidate = zones[(seed + k * 13 + z) % zones.length]
      if (!usedZones.has(candidate)) {
        zone = candidate
        break
      }
    }
    if (!zone) break
    usedZones.add(zone)

    const spec = OVERLAYS[overlayId]
    const anchor = ZONE_ANCHORS[zone]
    picks.push({
      id: overlayId,
      zone,
      left: Math.round(anchor.x - spec.size.w / 2),
      top: Math.round(anchor.y - spec.size.h / 2),
      width: spec.size.w,
      height: spec.size.h,
    })
  }
  return picks
}

/**
 * Carrega o SVG do disco, renderiza pra PNG buffer no tamanho final com
 * opacidade aplicada via alpha multiply. Sharp esperado no chamador.
 */
export async function loadOverlayBuffer(placement: OverlayPlacement): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  const spec = OVERLAYS[placement.id]
  const svgPath = path.join(OVERLAYS_DIR, spec.file)
  const svgRaw = await fs.readFile(svgPath)
  // Render SVG → PNG no tamanho final + aplica opacidade global.
  const png = await sharp(svgRaw)
    .resize(placement.width, placement.height, { fit: 'contain' })
    .png()
    .toBuffer()
  const withOpacity = await sharp(png)
    .ensureAlpha()
    .composite([
      {
        input: Buffer.from([255, 255, 255, Math.round(OVERLAY_OPACITY * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer()
  return withOpacity
}
