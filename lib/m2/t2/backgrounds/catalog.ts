/**
 * T2 Backgrounds — catálogo server-only
 *
 * Estado: STUB (Fase 0). Catálogo populado na Fase 1 quando Rafael subir
 * os 8 backgrounds em /public/brand/m2/backgrounds/.
 *
 * Cada entry referencia um PNG curado manualmente.
 * Code preenche metadata (palette/safeAreas/etc) junto com Rafael.
 *
 * Bloqueio Fase 1: assets manuais + template SVG de safeAreas.
 */

import type { BackgroundConfig } from '../types'

export const T2_BACKGROUNDS: BackgroundConfig[] = []

export function getBackground(id: string): BackgroundConfig {
  const found = T2_BACKGROUNDS.find((b) => b.id === id)
  if (!found) {
    throw new Error(`[T2] background "${id}" não está no catálogo — Fase 1 ainda não populou`)
  }
  return found
}

export function listFamilies(): string[] {
  return Array.from(new Set(T2_BACKGROUNDS.map((b) => b.family)))
}
