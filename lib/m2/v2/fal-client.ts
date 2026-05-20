/**
 * V2 FAL client — wrapper sobre client T2 (invariante isolamento)
 *
 * V2.0 mantém estratégia opaque (background gradient nativo do gpt-image-1)
 * — decisão Rafael 19/05/2026. Compose Sharp sobreposiciona overlays
 * texto/ícones sem mexer no hero.
 */

import { callGptImage1Product } from '../t2/fal-client'

export interface V2GenerateHeroArgs {
  prompt: string
  /** Default '1024x1536' (4:5 portrait, encaixa em 1080×1350 final). */
  imageSize?: '1024x1024' | '1536x1024' | '1024x1536'
}

/**
 * Gera hero V2 via gpt-image-1 opaque (mantém gradient nativo).
 * Custo: ~$0.063 por chamada (medium quality 1024×1536).
 */
export async function generateHeroV2(args: V2GenerateHeroArgs): Promise<Buffer> {
  const { prompt, imageSize = '1024x1536' } = args
  return callGptImage1Product({
    prompt,
    background: 'opaque', // V2.0: gradient nativo, não transparent
    imageSize,
  })
}
