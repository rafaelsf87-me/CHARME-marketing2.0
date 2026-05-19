/**
 * T2 Assets — Produto isolado via IA (DEC-M2-006, DEC-M2-014)
 *
 * Pipeline:
 *   1. gpt-image-1 high text-to-image com prompt template (background
 *      transparent, reforço de "no text, no scene")
 *   2. detectsAlphaPresent: se output já tem alpha, retorna direto
 *   3. Senão: callRembg pra cutout transparente
 *
 * Custo: ~$0.25/asset (gpt-image-1 high) + ~$0.005 se rembg necessário.
 *
 * IMPORTANTE — DEC-M2-014: NUNCA chamado quando imageSlot.source==='uploaded'.
 * Compose.ts tem branch explícito que bypassa product.ts pra uploads.
 */

import crypto from 'node:crypto'
import { callGptImage1Product, callRembg, detectsAlphaPresent } from '../fal-client'

// Sufixo obrigatório (Fase 6 v2, fix CRÍTICO 19/05/2026): força produto
// isolado em fundo transparente. Background é responsabilidade do compose
// Sharp (DEC-M2-014 + Pipeline Híbrido invariante). gpt-image-1 às vezes
// ignora `background='transparent'` no param e desenha cenário a partir
// do prompt; bloqueamos explicitamente menções a scene/surface/marble/etc.
const PRODUCT_PROMPT_TEMPLATE = (userPrompt: string): string =>
  `${userPrompt}, isolated subject on transparent background, no scene, no environment, no shadow on background, no surface, no counter, no marble, no table, no kitchen, no room, no wall, no floor, no text, no logo, no watermark, no UI elements, studio-quality lighting, product photography style, plain transparent background, realistic Brazilian commercial product photography, common product proportions as sold in Brazil.`

export interface GenerateProductArgs {
  /** Descrição do produto fornecida pelo user/Planner. */
  prompt: string
}

export interface GenerateProductResult {
  buffer: Buffer
  promptHash: string
  costUsd: number
}

function hashPrompt(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16)
}

export async function generateProductAsset(args: GenerateProductArgs): Promise<GenerateProductResult> {
  const fullPrompt = PRODUCT_PROMPT_TEMPLATE(args.prompt.trim())
  const promptHash = hashPrompt(fullPrompt)

  console.log(`[T2/product] gerando asset · hash=${promptHash}`)

  let buffer = await callGptImage1Product({
    prompt: fullPrompt,
    background: 'transparent',
    imageSize: '1024x1024',
  })
  let costUsd = 0.25

  // gpt-image-1 às vezes ignora background=transparent. Detecta + rembg fallback.
  const hasAlpha = await detectsAlphaPresent(buffer)
  if (!hasAlpha) {
    console.log(`[T2/product] alpha ausente — aplicando rembg (+$0.005)`)
    buffer = await callRembg(buffer)
    costUsd += 0.005
  }

  return { buffer, promptHash, costUsd }
}
