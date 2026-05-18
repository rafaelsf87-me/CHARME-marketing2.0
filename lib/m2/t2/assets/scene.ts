/**
 * T2 Assets — Cena ambiente via IA
 *
 * Pipeline:
 *   1. gpt-image-1 high text-to-image com prompt template
 *      (background neutro, sem texto)
 *   2. Sem rembg — cena costuma vir intencionalmente com fundo
 *
 * Diferença vs product.ts: cena pode conter contexto (sala, cozinha,
 * ambiente). Produto é inserido pelo Sharp compose depois.
 *
 * Custo: ~$0.25/asset.
 */

import crypto from 'node:crypto'
import { callGptImage1Product } from '../fal-client'

const SCENE_PROMPT_TEMPLATE = (userPrompt: string): string =>
  `${userPrompt}, realistic Brazilian household interior scene, soft natural lighting, no text, no logo, no watermark, no UI elements, no people in foreground, commercial-quality scene photography.`

export interface GenerateSceneArgs {
  /** Descrição da cena fornecida pelo user/Planner. */
  prompt: string
  /** Default '1024x1024'. */
  imageSize?: '1024x1024' | '1536x1024' | '1024x1536'
}

export interface GenerateSceneResult {
  buffer: Buffer
  promptHash: string
  costUsd: number
}

function hashPrompt(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16)
}

export async function generateSceneAsset(args: GenerateSceneArgs): Promise<GenerateSceneResult> {
  const fullPrompt = SCENE_PROMPT_TEMPLATE(args.prompt.trim())
  const promptHash = hashPrompt(fullPrompt)

  console.log(`[T2/scene] gerando asset · hash=${promptHash}`)

  const buffer = await callGptImage1Product({
    prompt: fullPrompt,
    background: 'auto', // cena tem fundo intencional
    imageSize: args.imageSize ?? '1024x1024',
  })

  return { buffer, promptHash, costUsd: 0.25 }
}
