/**
 * T2 Footer — wrap fino sobre lib/m2/footer-gen.ts existente
 *
 * Estado: STUB (Fase 0). Implementação na Fase 1.
 *
 * Re-expõe `generateFooterOverlay` com canvas T2 (1080×1350) e logo do
 * SlidePlan. Sem novidade lógica — footer-gen.ts já está completo.
 */

import type { SlidePlanFooter } from './types'

export async function buildFooterBuffer(_footer: SlidePlanFooter): Promise<Buffer> {
  throw new Error('[T2] footer.buildFooterBuffer — Fase 1 não implementada')
}
