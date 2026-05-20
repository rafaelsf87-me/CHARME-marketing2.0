/**
 * V2 FAL client — wrapper sobre client T2 (invariante isolamento)
 *
 * V2.0.1 (BUG-V2-001): hero gerado com background TRANSPARENT pra ser
 * composto sobre o gradient brand (compose.ts layer 0). Rembg como fallback
 * quando gpt-image-1 ignora `transparent` e devolve com fundo.
 */

import {
  callGptImage1Product,
  callRembg,
  detectsAlphaPresent,
} from '../t2/fal-client'

export interface V2GenerateHeroArgs {
  prompt: string
  /** Default '1024x1536' (4:5 portrait). */
  imageSize?: '1024x1024' | '1536x1024' | '1024x1536'
}

/**
 * Gera hero V2 com fundo transparente.
 *
 * Pipeline:
 *  1. gpt-image-1 medium, background='transparent', size 1024×1536
 *  2. detectsAlphaPresent: se ≥3 pixels canto/borda forem transparentes → OK
 *  3. Senão (modelo ignorou transparent) → rembg fallback
 *
 * Custo: ~$0.063 (medium 1024×1536) + ~$0.002 (rembg) se fallback.
 */
export async function generateHeroV2(args: V2GenerateHeroArgs): Promise<Buffer> {
  const { prompt, imageSize = '1024x1536' } = args
  const raw = await callGptImage1Product({
    prompt,
    background: 'transparent',
    imageSize,
  })
  const hasAlpha = await detectsAlphaPresent(raw)
  if (hasAlpha) {
    console.log('[V2] gpt-image-1 retornou alpha real — sem rembg')
    return raw
  }
  console.log('[V2] gpt-image-1 sem alpha — rodando rembg fallback')
  return callRembg(raw)
}
