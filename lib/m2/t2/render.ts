/**
 * T2 Render — orquestrador (Fase 3)
 *
 * Pipeline:
 *   1. parsed = t2InputSchema.parse(input)
 *   2. plans = buildSlidePlan(parsed)
 *   3. pack = newPack(contextoGeral) — cache em memória por-request
 *   4. resolveAssetsForPlan(plan, pack) pra cada slide:
 *      a. Pra cada imageSlot:
 *         - 'ai_generated': gera via product.ts/scene.ts, salva no pack
 *         - 'reused-from-pack': busca no pack via packKey
 *         - 'uploaded': bypass — compose.ts baixa direto (DEC-M2-014)
 *         - 'static-asset': bypass — compose.ts lê do disco
 *   5. composeSlide({ plan, imageBuffers: pack.buffers + assets resolvidos })
 *   6. validateSlide(buffer, plan) → QCReport (retry 1× se erro visual)
 *   7. uploadFn(buffer, key) → URL
 *   8. Retorna { results, pack serializado, tookMs, custo }
 *
 * uploadFn injetável (REF-M2-001 workaround M3 — Vercel Blob privado em dev).
 *
 * QC retry policy (DEC-M2-008):
 *   - Erros estruturais (CANVAS_DIM/FOOTER_MISSING/BLEED): falha hard
 *   - Erros visuais (LUMA, TEXT_OUTSIDE, etc): retry 1× só do asset
 *   - Warnings: entregam com badge no payload
 */

import { put } from '@vercel/blob'
import { composeSlide } from './compose'
import { validateSlide } from './qc'
import { buildSlidePlan, applyAjusteToPlan as _applyAjuste } from './planner'
import { generateProductAsset } from './assets/product'
import { generateSceneAsset } from './assets/scene'
import {
  addAsset,
  findAsset,
  newPack,
  serializePack,
  type CarouselAssetPackRuntime,
} from './assets/cache'
import { t2InputSchema, regerarSlideInputSchema } from './schema'
import type {
  CarouselAssetPack,
  ImageSlot,
  RegerarSlideInput,
  SlidePlan,
  SlideRenderResult,
  T2Input,
  T2RenderOutput,
} from './types'

export interface RenderM2T2Opts {
  /** Função de upload injetável (default Vercel Blob `put`). */
  uploadFn?: (buffer: Buffer, key: string) => Promise<string>
}

const STRUCTURAL_ERROR_CODES = new Set([
  'CANVAS_DIM_WRONG',
  'FOOTER_MISSING',
  'BLEED_CHECK_FAILED',
  'IMAGE_SLOT_EMPTY',
])

// ─── Asset resolution ───────────────────────────────────────────────────────

interface ResolvedImageBuffers {
  byId: Map<string, Buffer>
}

/**
 * Resolve imageSlots de um plan, consultando/populando o pack.
 *
 * - 'reused-from-pack': consulta pack via packKey. Falha se não existir.
 * - 'ai_generated': gera (product ou scene conforme assetType), salva no pack
 *   se vier com packKey (pra reuso entre slides), senão só retorna buffer.
 * - 'uploaded' / 'static-asset': não toca aqui — compose.ts resolve.
 */
async function resolveAssetsForPlan(
  plan: SlidePlan,
  pack: CarouselAssetPackRuntime,
): Promise<ResolvedImageBuffers> {
  const byId = new Map<string, Buffer>()

  // Paraleliza geração dentro do mesmo plan (slot a slot quando independentes).
  await Promise.all(
    plan.imageSlots.map(async (slot) => {
      switch (slot.source) {
        case 'reused-from-pack': {
          if (!slot.packKey) throw new Error(`[T2/render] slot ${slot.id} reused-from-pack sem packKey`)
          const cached = findAsset(pack, slot.packKey)
          if (!cached) {
            throw new Error(
              `[T2/render] packKey "${slot.packKey}" não encontrado no pack — slot ${slot.id} (slide ${plan.slideId})`,
            )
          }
          byId.set(slot.id, cached.buffer)
          break
        }
        case 'ai_generated': {
          if (!slot.ai) throw new Error(`[T2/render] slot ${slot.id} ai_generated sem ai.prompt`)
          // Se já temos um asset com o mesmo prompt no pack, reusa direto.
          const packKey = slot.packKey ?? `slot-${slot.id}`
          const existing = findAsset(pack, packKey)
          if (existing) {
            byId.set(slot.id, existing.buffer)
            console.log(`[T2/render] cache HIT packKey=${packKey} slot=${slot.id}`)
            break
          }
          const generator = slot.ai.assetType === 'scene' ? generateSceneAsset : generateProductAsset
          const result = await generator({ prompt: slot.ai.prompt })
          addAsset(pack, {
            packKey,
            entry: {
              url: '', // não usamos URL — buffer in-memory
              promptHash: result.promptHash,
              assetType: slot.ai.assetType,
              transparent: slot.ai.assetType === 'product',
            },
            buffer: result.buffer,
            costUsd: result.costUsd,
          })
          byId.set(slot.id, result.buffer)
          break
        }
        // 'uploaded' e 'static-asset' são resolvidos no compose.ts
        case 'uploaded':
        case 'static-asset':
          break
      }
    }),
  )

  return { byId }
}

// ─── Default upload ─────────────────────────────────────────────────────────

async function defaultUpload(buffer: Buffer, key: string): Promise<string> {
  const blob = await put(key, buffer, {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'image/png',
  })
  return blob.url
}

// ─── Pipeline de 1 slide com retry visual ──────────────────────────────────

async function renderOneSlideWithRetry(args: {
  plan: SlidePlan
  pack: CarouselAssetPackRuntime
  uploadFn: NonNullable<RenderM2T2Opts['uploadFn']>
  attempt?: number
}): Promise<SlideRenderResult> {
  const { plan, pack, uploadFn, attempt = 1 } = args

  // Resolve assets do plan
  const resolved = await resolveAssetsForPlan(plan, pack)

  // Compose
  const buffer = await composeSlide({ plan, imageBuffers: resolved.byId })

  // QC
  const qc = await validateSlide({ buffer, plan })

  // Retry visual: errors NÃO-estruturais permitem 1× regen.
  if (!qc.pass && attempt === 1) {
    const onlyVisual = qc.errors.every((e) => !STRUCTURAL_ERROR_CODES.has(e.code))
    if (onlyVisual) {
      console.log(
        `[T2/render] ${plan.slideId} QC fail visual (attempt 1) — retry asset regen`,
      )
      // Limpa pack keys do plan pra forçar regen.
      for (const slot of plan.imageSlots) {
        if (slot.source === 'ai_generated') {
          const packKey = slot.packKey ?? `slot-${slot.id}`
          delete pack.assets[packKey]
          pack.buffers.delete(packKey)
        }
      }
      return renderOneSlideWithRetry({ plan, pack, uploadFn, attempt: 2 })
    }
  }

  // Upload
  const blobKey = `m2-t2/${Date.now()}-${plan.slideId}.png`
  const url = await uploadFn(buffer, blobKey)

  return {
    slideIndex: plan.slideIndex,
    slideId: plan.slideId,
    url,
    qc,
  }
}

// ─── renderM2T2 (entry point) ───────────────────────────────────────────────

export async function renderM2T2(input: T2Input, opts?: RenderM2T2Opts): Promise<T2RenderOutput> {
  const startedAt = Date.now()

  const parsed = t2InputSchema.parse(input)
  const plans = buildSlidePlan(parsed)

  const pack = newPack(parsed.contextoGeral ?? `t2-${Date.now()}`)
  const uploadFn = opts?.uploadFn ?? defaultUpload

  // Sequencial pra preservar ordem de log + permitir cache pack entre slides.
  // (Slides do mesmo carrossel que reusam 'product-main' ganham do cache.)
  const results: SlideRenderResult[] = []
  for (const plan of plans) {
    const r = await renderOneSlideWithRetry({ plan, pack, uploadFn })
    results.push(r)
  }

  return {
    results,
    pack: serializePack(pack),
    tookMs: Date.now() - startedAt,
  }
}

// ─── renderSlideRegerar (Fase 4) ───────────────────────────────────────────

export interface RenderSlideRegerarResult {
  result: SlideRenderResult
  pack: CarouselAssetPack | null
}

export async function renderSlideRegerar(
  input: RegerarSlideInput,
  _opts?: RenderM2T2Opts,
): Promise<RenderSlideRegerarResult> {
  regerarSlideInputSchema.parse(input)
  // Fase 4: implementa applyAjusteToPlan + regen do slide isolado.
  throw new Error('[T2] render.renderSlideRegerar — Fase 4 não implementada')
}

// Re-export pra tooling externo se necessário.
export type { ImageSlot }
