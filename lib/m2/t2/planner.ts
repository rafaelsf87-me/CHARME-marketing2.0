/**
 * T2 Planner — input do user → SlidePlan[]
 *
 * Estado: STUB (Fase 0). Implementação na Fase 2.
 *
 * Responsabilidades quando implementado:
 * - Recebe T2Input já parseado por Zod
 * - Para cada slide, infere subtemplateId por densidade do copyTexto
 * - Seleciona backgroundId via backgrounds/select.ts (regra de family)
 * - Constrói textSlots por subtemplate + auto-fit hint
 * - Decide imageSlots: ai_generated vs uploaded vs reused-from-pack
 * - Valida output via slidePlanSchema
 */

import type { T2Input, SlidePlan, RegerarSlideInput } from './types'

export function buildSlidePlan(_input: T2Input): SlidePlan[] {
  throw new Error('[T2] planner.buildSlidePlan — Fase 2 não implementada')
}

/**
 * Interpreta ajustePrompt do regerar e modifica SlidePlan original.
 *
 * Heurística (Fase 4):
 * - "fundo" / "cor" / "claro" / "escuro" → troca backgroundId mantendo family
 * - menção a produto / objeto / "imagem" → marca imageSlot ai como dirty
 *   (regenera, sai do pack)
 * - "diminuir fonte" / "encurtar" / "menos texto" → ajusta textSlots
 * - sem match claro → re-roda render com mesmos slots
 */
export function applyAjusteToPlan(_input: RegerarSlideInput): SlidePlan {
  throw new Error('[T2] planner.applyAjusteToPlan — Fase 4 não implementada')
}
