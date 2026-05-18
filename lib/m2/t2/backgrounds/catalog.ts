/**
 * T2 Backgrounds — catálogo server-only
 *
 * Fase 1 (2026-05-18): populado com 10 backgrounds curados manualmente pelo
 * Rafael (DEC-M2-005, MEL-M2-001).
 *
 * Análise visual feita pelo Code:
 * - position: onde está o brilho/nebulosa mais forte
 * - palette: 3 hexes dominantes amostrados visualmente
 * - contrast: light-text pra fundos escuros (todos), dark-text pra solid-white
 *   (não há solid-white na Fase 1 — divergência com comando original)
 * - density: medium pros starfield (texturas), sparse pros solid-purple
 *
 * Safe area padrão (top 60, right 60, bottom 180, left 60). Bottom 180 reserva
 * espaço pro footer programático (120px footer + 60px breathing room).
 */

import type { BackgroundConfig } from '../types'

const BG_DIR = '/brand/m2/backgrounds'

const DEFAULT_SAFE_AREAS = { top: 60, right: 60, bottom: 180, left: 60 } as const

/** Family `starfield` — 8 variants, allow carrossel + imagem-única. */
const STARFIELD_PALETTE = {
  primary: '#2E1A6B',
  secondary: '#4A2BB8',
  accent: '#6B8FE0',
} as const

/** Family `solid-purple` — 2 variants, só imagem-única. */
const SOLID_PURPLE_PALETTE = {
  primary: '#2A1772',
  secondary: '#4521B8',
  accent: '#3A6DD8',
} as const

export const T2_BACKGROUNDS: BackgroundConfig[] = [
  {
    id: 'starfield-01',
    file: `${BG_DIR}/starfield-01.png`,
    family: 'starfield',
    position: 'top-anchored',
    palette: STARFIELD_PALETTE,
    safeAreas: DEFAULT_SAFE_AREAS,
    contrast: 'light-text',
    density: 'busy',
    allowedFormats: ['carrossel', 'imagem-unica'],
  },
  {
    id: 'starfield-02',
    file: `${BG_DIR}/starfield-02.png`,
    family: 'starfield',
    position: 'centered',
    palette: STARFIELD_PALETTE,
    safeAreas: DEFAULT_SAFE_AREAS,
    contrast: 'light-text',
    density: 'busy',
    allowedFormats: ['carrossel', 'imagem-unica'],
  },
  {
    id: 'starfield-03',
    file: `${BG_DIR}/starfield-03.png`,
    family: 'starfield',
    position: 'top-anchored',
    palette: STARFIELD_PALETTE,
    safeAreas: DEFAULT_SAFE_AREAS,
    contrast: 'light-text',
    density: 'busy',
    allowedFormats: ['carrossel', 'imagem-unica'],
  },
  {
    id: 'starfield-04',
    file: `${BG_DIR}/starfield-04.png`,
    family: 'starfield',
    position: 'centered',
    palette: STARFIELD_PALETTE,
    safeAreas: DEFAULT_SAFE_AREAS,
    contrast: 'light-text',
    density: 'busy',
    allowedFormats: ['carrossel', 'imagem-unica'],
  },
  {
    id: 'starfield-05',
    file: `${BG_DIR}/starfield-05.png`,
    family: 'starfield',
    position: 'bottom-anchored',
    palette: STARFIELD_PALETTE,
    safeAreas: DEFAULT_SAFE_AREAS,
    contrast: 'light-text',
    density: 'busy',
    allowedFormats: ['carrossel', 'imagem-unica'],
  },
  {
    id: 'starfield-06',
    file: `${BG_DIR}/starfield-06.png`,
    family: 'starfield',
    position: 'centered',
    palette: STARFIELD_PALETTE,
    safeAreas: DEFAULT_SAFE_AREAS,
    contrast: 'light-text',
    density: 'busy',
    allowedFormats: ['carrossel', 'imagem-unica'],
  },
  {
    id: 'starfield-07',
    file: `${BG_DIR}/starfield-07.png`,
    family: 'starfield',
    position: 'bottom-anchored',
    palette: STARFIELD_PALETTE,
    safeAreas: DEFAULT_SAFE_AREAS,
    contrast: 'light-text',
    density: 'busy',
    allowedFormats: ['carrossel', 'imagem-unica'],
  },
  {
    id: 'starfield-08',
    file: `${BG_DIR}/starfield-08.png`,
    family: 'starfield',
    // starfield-08 tem nebulosa verde — único com green accent.
    position: 'centered',
    palette: {
      primary: '#3A1AA0',
      secondary: '#6B33CC',
      accent: '#6BC79A',
    },
    safeAreas: DEFAULT_SAFE_AREAS,
    contrast: 'light-text',
    density: 'busy',
    allowedFormats: ['carrossel', 'imagem-unica'],
  },
  {
    id: 'solid-purple-01',
    file: `${BG_DIR}/solid-purple-01.png`,
    family: 'solid-purple',
    position: 'top-anchored',
    palette: SOLID_PURPLE_PALETTE,
    safeAreas: DEFAULT_SAFE_AREAS,
    contrast: 'light-text',
    density: 'sparse',
    allowedFormats: ['imagem-unica'],
  },
  {
    id: 'solid-purple-02',
    file: `${BG_DIR}/solid-purple-02.png`,
    family: 'solid-purple',
    position: 'bottom-anchored',
    palette: SOLID_PURPLE_PALETTE,
    safeAreas: DEFAULT_SAFE_AREAS,
    contrast: 'light-text',
    density: 'sparse',
    allowedFormats: ['imagem-unica'],
  },
  {
    // cta-final-bg-01: footer (logo casinha + @charmedodetalhe) já EMBUTIDO
    // visualmente no PNG (DEC-M2-015). Safe area ajustada com bottom 250
    // pra preservar a faixa do footer embutido durante render dos textos.
    id: 'cta-final-bg-01',
    file: `${BG_DIR}/cta-final-bg-01.png`,
    family: 'cta-final',
    position: 'centered',
    palette: STARFIELD_PALETTE,
    safeAreas: { top: 60, right: 60, bottom: 250, left: 60 },
    contrast: 'light-text',
    density: 'busy',
    allowedFormats: ['carrossel', 'imagem-unica'],
  },
]

export function getBackground(id: string): BackgroundConfig {
  const found = T2_BACKGROUNDS.find((b) => b.id === id)
  if (!found) {
    throw new Error(`[T2] background "${id}" não está no catálogo`)
  }
  return found
}

export function listFamilies(): string[] {
  return Array.from(new Set(T2_BACKGROUNDS.map((b) => b.family)))
}

/** Backgrounds elegíveis pra carrossel: family precisa ter ≥3 variants. */
export function getCarouselEligibleBackgrounds(): BackgroundConfig[] {
  const familyCount = new Map<string, number>()
  for (const b of T2_BACKGROUNDS) {
    if (b.allowedFormats.includes('carrossel')) {
      familyCount.set(b.family, (familyCount.get(b.family) ?? 0) + 1)
    }
  }
  return T2_BACKGROUNDS.filter(
    (b) => b.allowedFormats.includes('carrossel') && (familyCount.get(b.family) ?? 0) >= 3,
  )
}

/** Backgrounds elegíveis pra imagem-única: qualquer com 'imagem-unica'. */
export function getSingleEligibleBackgrounds(): BackgroundConfig[] {
  return T2_BACKGROUNDS.filter((b) => b.allowedFormats.includes('imagem-unica'))
}
