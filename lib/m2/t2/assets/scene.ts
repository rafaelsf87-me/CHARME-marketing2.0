/**
 * T2 Assets — Cena ambiente via IA
 *
 * Estado: STUB (Fase 0). Implementação na Fase 3.
 *
 * Modelo: gpt-image-1 high. Diferença vs product: cena pode ter contexto
 * (sala, ambiente), produto inserido pelo Sharp compose depois.
 *
 * Output: PNG fundo neutro/transparente conforme subtemplate.
 */

export interface GenerateSceneArgs {
  prompt: string
  promptHash: string
}

export interface GenerateSceneResult {
  url: string
  promptHash: string
}

export async function generateSceneAsset(_args: GenerateSceneArgs): Promise<GenerateSceneResult> {
  throw new Error('[T2] assets.generateSceneAsset — Fase 3 não implementada')
}
