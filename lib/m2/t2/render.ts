/**
 * T2 Render — orquestrador
 *
 * Estado: STUB (Fase 0). Implementação Fases 1→3.
 *
 * Pipeline (Fase 3 completa):
 *   1. parsed = t2InputSchema.parse(input)
 *   2. plans = buildSlidePlan(parsed)
 *   3. pack = newPack(parsed.contextoGeral + produto descrito)
 *   4. Pra cada plan em paralelo:
 *      a. Resolve cada imageSlot:
 *         - source='ai_generated': generateProductAsset/SceneAsset → addAsset(pack)
 *         - source='uploaded': fetch uploadedUrl → buffer (NÃO vai pra IA)
 *         - source='reused-from-pack': findAsset(pack, packKey)
 *         - source='static-asset': fs.readFile(staticPath)
 *      b. composeSlide(plan, imageBuffers)
 *      c. validateSlide(buffer, plan) → QCReport
 *      d. Retry 1× se erro visual; falha hard se erro estrutural
 *      e. Upload via uploadFn injetável (default Vercel Blob)
 *   5. Retorna { results, pack, tookMs }
 *
 * uploadFn injetável (padrão M3 — workaround REF-M2-001 store privado em dev).
 *
 * Regerar slide (DEC-M2-013): função separada renderSlideRegerar(),
 * recebe applyAjusteToPlan(input) output, executa só passos 4+5 pro slideIndex.
 */

import type { CarouselAssetPack, RegerarSlideInput, T2Input, T2RenderOutput, SlideRenderResult } from './types'

export interface RenderM2T2Opts {
  /** Função de upload injetável (default Vercel Blob `put`). */
  uploadFn?: (buffer: Buffer, key: string) => Promise<string>
}

export async function renderM2T2(_input: T2Input, _opts?: RenderM2T2Opts): Promise<T2RenderOutput> {
  throw new Error('[T2] render.renderM2T2 — Fase 3 não implementada')
}

export interface RenderSlideRegerarResult {
  result: SlideRenderResult
  /** Pack atualizado se asset foi regenerado. */
  pack: CarouselAssetPack | null
}

export async function renderSlideRegerar(
  _input: RegerarSlideInput,
  _opts?: RenderM2T2Opts,
): Promise<RenderSlideRegerarResult> {
  throw new Error('[T2] render.renderSlideRegerar — Fase 4 não implementada')
}
