/**
 * T2 Assets — Produto isolado via IA
 *
 * Estado: STUB (Fase 0). Implementação na Fase 3.
 *
 * Modelo: gpt-image-1 high (decisão Rafael).
 * Prompt template: "isolated product on neutral light gray background,
 *   no text, no shadow, no UI elements, no watermark, no other objects".
 *
 * Output: PNG. Sharp posiciona dentro de imageSlot.
 *
 * Custo: ~$0.25/asset. CarouselAssetPack reduz via reuso (1 produto
 * principal por carrossel).
 */

export interface GenerateProductArgs {
  prompt: string
  /** Hash do prompt — usado como packKey pra reuso entre slides. */
  promptHash: string
}

export interface GenerateProductResult {
  url: string
  promptHash: string
}

export async function generateProductAsset(_args: GenerateProductArgs): Promise<GenerateProductResult> {
  throw new Error('[T2] assets.generateProductAsset — Fase 3 não implementada')
}
