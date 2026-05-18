/**
 * T2 QC — validador programático com score
 *
 * Estado: STUB (Fase 0). Mínimo na Fase 1, expansão Fase 2.
 *
 * Política (I6):
 * - Erros estruturais → falha hard sem retry
 *   (CANVAS_DIM_WRONG, FOOTER_MISSING, IMAGE_SLOT_EMPTY)
 * - Erros visuais → retry 1× só do asset/render
 *   (TEXT_OUTSIDE_SAFE_AREA, BACKGROUND_LUMA_VS_TEXT, BLEED_CHECK_FAILED)
 * - Warnings → entregam com badge no UI
 *   (TEXT_TRUNCATED, FOOTER_PARTIAL, UPLOAD_LEAKED_REFERENCE)
 *
 * qualityScore: 100 base; −20 por error; −5 por warning; floor 0.
 */

import type { QCReport, SlidePlan } from './types'

export interface ValidateSlideArgs {
  buffer: Buffer
  plan: SlidePlan
}

export async function validateSlide(_args: ValidateSlideArgs): Promise<QCReport> {
  throw new Error('[T2] qc.validateSlide — Fase 1 não implementada')
}

/**
 * OCR fina dentro do bounding box de imageSlots com source='uploaded'.
 * Emite UPLOAD_LEAKED_REFERENCE (warning) se detectar texto longo.
 * Sinal de vazamento da política DEC-M2-014.
 *
 * Estado: STUB (Fase 0). Implementação na Fase 2.
 */
export async function checkUploadLeak(_args: ValidateSlideArgs): Promise<QCReport['warnings']> {
  throw new Error('[T2] qc.checkUploadLeak — Fase 2 não implementada')
}
