/**
 * T2 Compose — Sharp pipeline final
 *
 * Estado: STUB (Fase 0). Implementação na Fase 1.
 *
 * Pipeline:
 *   1. Carrega backgroundBuffer do catalog
 *   2. Renderiza subtemplate via Satori → SVG → resvg → PNG buffer
 *   3. Composite subtemplate sobre background
 *   4. Composite footerBuffer no canto bottom
 *   5. Convert pra WEBP qual 90 (alinhado ao M3)
 *
 * Branch crítico (DEC-M2-014):
 *   imageSlot.source === 'uploaded' → bypass assets/ generation,
 *   carrega buffer direto da uploadedUrl, Sharp composite no slot.box.
 */

import type { SlidePlan } from './types'

export interface ComposeSlideArgs {
  plan: SlidePlan
  /** Map de imageSlot.id → Buffer já resolvido (IA gerou OU upload baixou). */
  imageBuffers: Map<string, Buffer>
}

export async function composeSlide(_args: ComposeSlideArgs): Promise<Buffer> {
  throw new Error('[T2] compose.composeSlide — Fase 1 não implementada')
}
