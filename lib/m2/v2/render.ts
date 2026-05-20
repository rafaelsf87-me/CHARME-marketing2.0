/**
 * V2 Render — orquestrador atômico
 *
 * Pipeline:
 *   1. v2InputSchema.parse(input)
 *   2. plan = await planV2(input)  — LLM Claude Haiku
 *   3. hero buffer:
 *        - modo IA: generateHeroV2 (gpt-image-1 opaque)
 *        - modo upload: fetch da URL
 *   4. composeV2 → PNG final
 *   5. runQc → report (não bloqueia)
 *   6. uploadFn → URL
 *
 * uploadFn injetável (REF-M2-001 — Vercel Blob privado em dev).
 *
 * Custo estimado por chamada:
 *   - LLM Claude Haiku planner: ~$0.005
 *   - gpt-image-1 medium 1024×1536: ~$0.063
 *   - Total IA: ~$0.07
 *   - Total Upload: ~$0.005 (só LLM)
 */

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { put } from '@vercel/blob'
import { v2InputSchema } from './schema'
import { planV2 } from './planner'
import { generateHeroV2 } from './fal-client'
import { composeV2 } from './compose'
import { runQc, type V2QCReport } from './qc'
import type { PlanVia } from './planner'
import type { V2Input, V2Plan, V2RenderOutput, V2CapaVariant } from './types'

export interface RenderV2Opts {
  /** Origin público pra Satori carregar SVGs (ex: 'http://localhost:3000'). */
  origin: string
  /** Função de upload injetável. Default Vercel Blob `put` com access:public. */
  uploadFn?: (buffer: Buffer, key: string) => Promise<string>
}

export interface RenderV2Result extends V2RenderOutput {
  qc: V2QCReport
  via: PlanVia
}

const COST_PER_LLM_CALL_USD = 0.005 // Claude Haiku 4.5 ballpark
const COST_PER_GPT_IMAGE_1_USD = 0.063 // medium quality 1024×1536

async function fetchUploadedAsset(url: string): Promise<Buffer> {
  // Dev helper: suporta file:// e paths relativos a public/ pra scripts offline.
  if (url.startsWith('file://')) {
    return fs.readFile(url.replace('file://', ''))
  }
  if (url.startsWith('/brand/') || url.startsWith('/fonts/')) {
    return fs.readFile(path.join(process.cwd(), 'public', url))
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`[V2] Falha ao baixar upload (${res.status}): ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

function augmentHeroPromptForVariant(prompt: string, variant: V2CapaVariant): string {
  // V2.0.1: hero é isolado em fundo transparente (gradient brand vem do compose).
  // Aspect hint ajuda gpt-image-1 a compor o sujeito na orientação certa.
  if (variant === 'capa-longa') {
    return `${prompt}. Subject framed for vertical portrait composition (4:5 aspect), centered.`
  }
  return `${prompt}. Subject framed for horizontal banner composition, centered, with empty transparent margins on top and bottom.`
}

function defaultUploadFn(buffer: Buffer, key: string): Promise<string> {
  return put(key, buffer, { access: 'public', contentType: 'image/png' }).then((r) => r.url)
}

export async function renderV2(input: V2Input, opts: RenderV2Opts): Promise<RenderV2Result> {
  const t0 = Date.now()
  const parsed = v2InputSchema.parse(input)

  // 1. Planner LLM
  const planResult = await planV2(parsed)
  const plan: V2Plan = planResult.plan

  // 2. Hero buffer
  let heroBuffer: Buffer
  let costUsd = COST_PER_LLM_CALL_USD
  if (plan.hero.source === 'uploaded') {
    heroBuffer = await fetchUploadedAsset(plan.hero.uploadedUrl!)
  } else {
    const augmentedPrompt = augmentHeroPromptForVariant(plan.hero.prompt!, plan.variant)
    heroBuffer = await generateHeroV2({ prompt: augmentedPrompt, imageSize: '1024x1536' })
    costUsd += COST_PER_GPT_IMAGE_1_USD
  }

  // 3. Compose
  const finalBuffer = await composeV2({
    plan,
    heroBuffer,
    logo: parsed.logo,
  })

  // 4. QC
  const qc = await runQc(finalBuffer, plan)

  // 5. Upload
  const uploadFn = opts.uploadFn ?? defaultUploadFn
  const hash = crypto.createHash('sha256').update(finalBuffer).digest('hex').slice(0, 8)
  const keyword = parsed.keyword ?? plan.templateType
  const key = `m2-v2/${plan.templateType}-${plan.variant}-${keyword}-${hash}.png`
  const url = await uploadFn(finalBuffer, key)

  return {
    url,
    plan,
    tookMs: Date.now() - t0,
    costUsd,
    qc,
    via: planResult.via,
  }
}

/**
 * Variante "preview local" — não faz upload, devolve buffer direto.
 * Usado em scripts smoke/dev pra evitar dependência de Vercel Blob.
 */
export interface RenderV2BufferResult {
  buffer: Buffer
  plan: V2Plan
  qc: V2QCReport
  via: PlanVia
  tookMs: number
  costUsd: number
}

export async function renderV2ToBuffer(input: V2Input): Promise<RenderV2BufferResult> {
  const t0 = Date.now()
  const parsed = v2InputSchema.parse(input)

  const planResult = await planV2(parsed)
  const plan = planResult.plan

  let heroBuffer: Buffer
  let costUsd = COST_PER_LLM_CALL_USD
  if (plan.hero.source === 'uploaded') {
    heroBuffer = await fetchUploadedAsset(plan.hero.uploadedUrl!)
  } else {
    const augmentedPrompt = augmentHeroPromptForVariant(plan.hero.prompt!, plan.variant)
    heroBuffer = await generateHeroV2({ prompt: augmentedPrompt, imageSize: '1024x1536' })
    costUsd += COST_PER_GPT_IMAGE_1_USD
  }

  const buffer = await composeV2({ plan, heroBuffer, logo: parsed.logo })
  const qc = await runQc(buffer, plan)

  return {
    buffer,
    plan,
    qc,
    via: planResult.via,
    tookMs: Date.now() - t0,
    costUsd,
  }
}
