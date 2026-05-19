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
import {
  callGptImage1Product,
  callGptImage1Edit,
  callRembg,
  detectsAlphaPresent,
  uploadToFalStorage,
} from '../fal-client'

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

// ─── FIX 6 V1.1.1 (MEL-M2-004): par before/after com forma idêntica ──────────

export interface GenerateProductPairArgs {
  /** Prompt do estado "depois/bom/novo" — gerado primeiro via text-to-image. */
  promptAfter: string
  /** Prompt do estado "antes/ruim/velho" — gerado via edit-image com after como ref. */
  promptBefore: string
}

export interface GenerateProductPairResult {
  after: GenerateProductResult
  before: GenerateProductResult
  /** Custo total do par (em USD). */
  totalCostUsd: number
}

/**
 * Gera par before/after com forma física IDÊNTICA via img2img.
 *
 * Workflow (MEL-M2-004 V1.1.1):
 *   1. Gera AFTER (estado limpo/novo) via gpt-image-1/text-to-image
 *   2. Upload do buffer pro fal.storage → URL pública
 *   3. Gera BEFORE via gpt-image-1/edit-image com:
 *      - image_urls = [URL do after]
 *      - input_fidelity = 'high' (forte preservação de forma)
 *      - prompt focado em "same product, only condition differs"
 *
 * Custo: ~$0.50/par (2× gpt-image-1 high). Tempo: ~60s sequencial.
 */
export async function generateProductPair(args: GenerateProductPairArgs): Promise<GenerateProductPairResult> {
  // 1) AFTER via text-to-image (mesma pipeline do generateProductAsset).
  console.log(`[T2/product/pair] gerando AFTER via text-to-image`)
  const afterResult = await generateProductAsset({ prompt: args.promptAfter })

  // 2) Upload do AFTER pro fal.storage pra obter URL pública.
  console.log(`[T2/product/pair] uploading AFTER pro fal.storage`)
  const afterUrl = await uploadToFalStorage(afterResult.buffer)

  // 3) BEFORE via edit-image com after como reference.
  const beforePromptCore = args.promptBefore.trim()
  const beforeFullPrompt = `EXACTLY the same product as the reference image: identical dimensions, identical shape, identical proportions, identical material, identical brand. Same physical form. Only the surface condition differs. Show this product in the following state: ${beforePromptCore}. isolated subject on transparent background, no scene, no environment, no surface, no text, no logo, no watermark, studio-quality lighting, realistic Brazilian commercial product photography.`
  const beforePromptHash = hashPrompt(beforeFullPrompt)
  console.log(`[T2/product/pair] gerando BEFORE via edit-image (fidelity=high) · hash=${beforePromptHash}`)

  let beforeBuffer = await callGptImage1Edit({
    prompt: beforeFullPrompt,
    referenceUrl: afterUrl,
    inputFidelity: 'high',
    background: 'transparent',
    imageSize: '1024x1024',
  })
  let beforeCost = 0.25

  const hasAlpha = await detectsAlphaPresent(beforeBuffer)
  if (!hasAlpha) {
    console.log(`[T2/product/pair] BEFORE alpha ausente — aplicando rembg (+$0.005)`)
    beforeBuffer = await callRembg(beforeBuffer)
    beforeCost += 0.005
  }

  return {
    after: afterResult,
    before: { buffer: beforeBuffer, promptHash: beforePromptHash, costUsd: beforeCost },
    totalCostUsd: afterResult.costUsd + beforeCost,
  }
}
