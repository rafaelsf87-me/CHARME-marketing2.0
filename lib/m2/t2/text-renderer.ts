/**
 * T2 Text Renderer — auto-fit determinístico
 *
 * Estado: STUB (Fase 0). Implementação na Fase 1.
 *
 * Estratégia (Fase 1):
 * - Binary search no fontSize entre [fontSizeMin, fontSizeMax]
 * - Pra cada candidato, renderiza via Satori e mede bounding box
 * - Aceita maior tamanho que cabe no slot.box
 * - Se mesmo fontSizeMin extrapola → aplica overflowStrategy
 *   (shrink além do min, truncate-ellipsis, ou error)
 *
 * Nota: Satori não expõe measureText nativamente. Usar approach do M3
 * (lib/m3/templates/atual-maio26/layout-*.tsx): renderizar e checar
 * SVG bounds via resvg ou bounding box manual.
 */

import type { Rect, TextSlot } from './types'

export interface FitTextResult {
  fontSize: number
  fits: boolean
  truncatedTo?: string
}

export interface FitTextArgs {
  text: string
  slot: TextSlot
  box: Rect
  fontFamily: string
  fontWeight: number
  lineHeight: number
  fontSizeMin: number
  fontSizeMax: number
}

export function fitTextToBox(_args: FitTextArgs): FitTextResult {
  throw new Error('[T2] text-renderer.fitTextToBox — Fase 1 não implementada')
}
