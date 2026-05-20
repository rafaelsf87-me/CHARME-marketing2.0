/**
 * V2 Hero Zones (BUG-V2-002 — zonas de exclusão)
 *
 * Cada variant define onde o hero é renderizado. Texto/badge/bullets/card
 * respeitam estas zonas pra evitar sobreposição visual indesejada.
 *
 * Pontos âncora (BUG-V2-003): onde os conectores dos bullets apontam.
 *  - CAPA-CURTA: 4 âncoras (cantos da zone — TL/TR/BL/BR)
 *  - CAPA-LONGA: 2 âncoras na borda esquerda do hero
 *  - CTA-FINAL: 2 âncoras (TL/TR) — só usa 2 bullets topo
 */

import { V2_CANVAS_WIDTH, V2_CANVAS_HEIGHT, type V2CapaVariant, type V2TemplateType } from './types'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface AnchorPoint {
  x: number
  y: number
}

export interface ZoneSpec {
  heroZone: Rect
  /** Pontos âncora dos conectores na ordem [TL, TR, BL, BR] (capa-curta/cta-final) ou [top, bottom] (capa-longa). */
  anchors: AnchorPoint[]
}

// ─── CAPA-CURTA ─────────────────────────────────────────────────────────────
// BUG-V2-008: hero ampliado pra ~40% (540px). Bullets TL/TR ficam acima (Y 380),
// BL/BR ficam DENTRO da zona expandida (Y 900) com text-shadow forte. Card Y 1040.

export const ZONE_CAPA_CURTA: ZoneSpec = {
  heroZone: { x: 90, y: 430, w: 900, h: 540 },
  anchors: [
    { x: 90 + 60, y: 430 + 40 }, // TL
    { x: 90 + 900 - 60, y: 430 + 40 }, // TR
    { x: 90 + 60, y: 430 + 540 - 40 }, // BL
    { x: 90 + 900 - 60, y: 430 + 540 - 40 }, // BR
  ],
}

// ─── CAPA-LONGA ─────────────────────────────────────────────────────────────
// Hero zone: lateral direita 40%. Esquerda 60% é texto puro sobre gradient.

export const ZONE_CAPA_LONGA: ZoneSpec = {
  heroZone: { x: 580, y: 280, w: 440, h: 720 },
  anchors: [
    { x: 580 + 20, y: 280 + 120 }, // top: borda esquerda do hero, alto
    { x: 580 + 20, y: 280 + 720 - 120 }, // bottom: borda esquerda do hero, baixo
  ],
}

// ─── CTA-FINAL ──────────────────────────────────────────────────────────────
// Hero menor que CAPA-CURTA porque botão CTA + footer ocupam ~330px do inferior.
// Hero zone: Y 380-840 (460px). Botão Y 880, Footer Y 1230.

export const ZONE_CTA_FINAL: ZoneSpec = {
  heroZone: { x: 110, y: 380, w: 860, h: 460 },
  anchors: [
    { x: 110 + 60, y: 380 + 40 },
    { x: 110 + 860 - 60, y: 380 + 40 },
    { x: 110 + 60, y: 380 + 460 - 40 },
    { x: 110 + 860 - 60, y: 380 + 460 - 40 },
  ],
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────

export function getZone(templateType: V2TemplateType, variant: V2CapaVariant): ZoneSpec {
  if (templateType === 'cta-final') return ZONE_CTA_FINAL
  if (variant === 'capa-longa') return ZONE_CAPA_LONGA
  return ZONE_CAPA_CURTA
}

// ─── Decorações brand (BUG-V2-001 layer 1) ──────────────────────────────────

export interface DecorPlacement {
  file: string
  x: number
  y: number
  w: number
  h: number
  opacity?: number
}

/** Decorações fixas pra cada variant. SVGs em /public/brand/m2/overlays/. */
export function getDecorations(templateType: V2TemplateType, variant: V2CapaVariant): DecorPlacement[] {
  if (templateType === 'cta-final' || variant === 'capa-curta') {
    return [
      // Sparkle topo-esquerdo
      { file: 'sparkle-cyan.svg', x: 20, y: 360, w: 80, h: 80, opacity: 0.7 },
      { file: 'sparkle-cyan.svg', x: 60, y: 280, w: 40, h: 40, opacity: 0.5 },
      // Dots topo-direito
      { file: 'dots-pattern.svg', x: 880, y: 80, w: 160, h: 160, opacity: 0.35 },
    ]
  }
  // capa-longa
  return [
    // Sparkle pequeno topo-esquerdo (acima do título)
    { file: 'sparkle-cyan.svg', x: 40, y: 40, w: 60, h: 60, opacity: 0.6 },
    // Dots no canto sup-direito (lado oposto ao texto)
    { file: 'dots-pattern.svg', x: 880, y: 20, w: 140, h: 140, opacity: 0.3 },
    // Linha decorativa centro-esquerda (próx ao texto)
    { file: 'line-decoration.svg', x: 40, y: 700, w: 200, h: 40, opacity: 0.4 },
  ]
}

// ─── Helper geom ────────────────────────────────────────────────────────────

export const CANVAS = { w: V2_CANVAS_WIDTH, h: V2_CANVAS_HEIGHT }
