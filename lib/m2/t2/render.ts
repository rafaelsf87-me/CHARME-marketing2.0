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

import crypto from 'node:crypto'
import { put } from '@vercel/blob'
import { composeSlide } from './compose'
import { validateSlide } from './qc'
import { buildSlidePlanWithParser, applyAjusteToPlan as _applyAjuste } from './planner'
import { generateProductAsset, generateProductPair } from './assets/product'
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
 *
 * Quando `uploadFn` está disponível, o buffer do asset também sobe pro Blob
 * (URL pública). Isso permite que /regerar receba pack com URLs persistidas
 * e reuse assets sem re-gerar (DEC-M2-013).
 */
async function resolveAssetsForPlan(
  plan: SlidePlan,
  pack: CarouselAssetPackRuntime,
  uploadFn: NonNullable<RenderM2T2Opts['uploadFn']>,
): Promise<ResolvedImageBuffers> {
  const byId = new Map<string, Buffer>()

  // FIX 6 V1.1.1 (MEL-M2-004): comparison-before-after gera par via img2img
  // pra preservar forma física idêntica. Detecta se o plan tem AMBOS slots
  // image-before + image-after marcados como ai_generated — se sim, usa
  // generateProductPair (sequencial: after via text → before via edit-image
  // com after como reference). Caso contrário, geração independente.
  const beforeSlot = plan.imageSlots.find((s) => s.id === 'image-before' && s.source === 'ai_generated')
  const afterSlot = plan.imageSlots.find((s) => s.id === 'image-after' && s.source === 'ai_generated')
  if (beforeSlot && afterSlot && beforeSlot.ai && afterSlot.ai) {
    const beforeHash = crypto.createHash('sha256').update(beforeSlot.ai.prompt).digest('hex').slice(0, 8)
    const afterHash = crypto.createHash('sha256').update(afterSlot.ai.prompt).digest('hex').slice(0, 8)
    const beforeKey = beforeSlot.packKey ?? `slot-image-before-${beforeHash}`
    const afterKey = afterSlot.packKey ?? `slot-image-after-${afterHash}`

    const beforeCached = findAsset(pack, beforeKey)
    const afterCached = findAsset(pack, afterKey)
    if (beforeCached && afterCached) {
      byId.set('image-before', beforeCached.buffer)
      byId.set('image-after', afterCached.buffer)
      console.log(`[T2/render] cache HIT comparison pair (before+after)`)
    } else {
      const pair = await generateProductPair({
        promptAfter: afterSlot.ai.prompt,
        promptBefore: beforeSlot.ai.prompt,
      })
      // Upload assets (URLs persistidas pra /regerar) e registra no pack.
      const afterUrl = await uploadFn(
        pair.after.buffer,
        `m2-t2/assets/${pack.packHash}-${afterKey}-${Date.now()}.png`,
      ).catch(() => '')
      const beforeUrl = await uploadFn(
        pair.before.buffer,
        `m2-t2/assets/${pack.packHash}-${beforeKey}-${Date.now()}.png`,
      ).catch(() => '')
      addAsset(pack, {
        packKey: afterKey,
        entry: { url: afterUrl, promptHash: pair.after.promptHash, assetType: 'product', transparent: true },
        buffer: pair.after.buffer,
        costUsd: pair.after.costUsd,
      })
      addAsset(pack, {
        packKey: beforeKey,
        entry: { url: beforeUrl, promptHash: pair.before.promptHash, assetType: 'product', transparent: true },
        buffer: pair.before.buffer,
        costUsd: pair.before.costUsd,
      })
      byId.set('image-after', pair.after.buffer)
      byId.set('image-before', pair.before.buffer)
    }
    // Demais slots (uploaded/static) seguem fluxo normal abaixo.
  }

  // Paraleliza geração dentro do mesmo plan (slot a slot quando independentes).
  await Promise.all(
    plan.imageSlots.map(async (slot) => {
      // Pula slots já resolvidos pelo par comparison.
      if (byId.has(slot.id)) return
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
          // Fase 6 v2 fix: packKey precisa incluir hash do prompt — slot.id
          // sozinho colide entre slides do mesmo carrossel quando todos usam
          // o mesmo id 'image-main' (BUG-M2-004 introduziu). Hash do prompt
          // permite reuso real quando 2 slides pedem EXATAMENTE o mesmo
          // produto e re-geração quando os prompts diferem.
          const promptKey = crypto
            .createHash('sha256')
            .update(slot.ai.prompt)
            .digest('hex')
            .slice(0, 8)
          const packKey = slot.packKey ?? `slot-${slot.id}-${promptKey}`
          const existing = findAsset(pack, packKey)
          if (existing) {
            byId.set(slot.id, existing.buffer)
            console.log(`[T2/render] cache HIT packKey=${packKey} slot=${slot.id}`)
            break
          }
          const generator = slot.ai.assetType === 'scene' ? generateSceneAsset : generateProductAsset
          const result = await generator({ prompt: slot.ai.prompt })
          // DEC-M2-013: faz upload do asset pro Blob pra URL persistida,
          // permitindo reuso em /regerar.
          const assetKey = `m2-t2/assets/${pack.packHash}-${packKey}-${Date.now()}.png`
          const assetUrl = await uploadFn(result.buffer, assetKey).catch((err) => {
            console.warn(`[T2/render] upload asset falhou (sem URL persistida): ${err}`)
            return ''
          })
          addAsset(pack, {
            packKey,
            entry: {
              url: assetUrl,
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

/**
 * Rehydrate pack do payload (regerar): baixa URLs dos assets e popula
 * buffers na memória. Pula entries sem URL (falha graciosa).
 */
async function rehydratePackBuffers(
  pack: CarouselAssetPackRuntime,
): Promise<void> {
  await Promise.all(
    Object.entries(pack.assets).map(async ([packKey, entry]) => {
      if (!entry.url || pack.buffers.has(packKey)) return
      try {
        const res = await fetch(entry.url)
        if (!res.ok) return
        const arr = await res.arrayBuffer()
        pack.buffers.set(packKey, Buffer.from(arr))
      } catch (err) {
        console.warn(`[T2/render] rehydrate pack key=${packKey} falhou: ${err}`)
      }
    }),
  )
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
  overlaySeedKey?: string
}): Promise<SlideRenderResult> {
  const { plan, pack, uploadFn, attempt = 1, overlaySeedKey } = args

  // Resolve assets do plan
  const resolved = await resolveAssetsForPlan(plan, pack, uploadFn)

  // Compose
  const buffer = await composeSlide({ plan, imageBuffers: resolved.byId, overlaySeedKey })

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
      return renderOneSlideWithRetry({ plan, pack, uploadFn, attempt: 2, overlaySeedKey })
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
  // Fase 6 (BUG-M2-003 + BUG-M2-004): Planner async com LLM parser.
  const { plans, parserResults } = await buildSlidePlanWithParser(parsed)

  const pack = newPack(parsed.contextoGeral ?? `t2-${Date.now()}`)
  const uploadFn = opts?.uploadFn ?? defaultUpload
  // V1.1.1 (MEL-M2-017): overlaySeedKey compartilhado entre slides do mesmo
  // carrossel pra continuidade visual (mesmo set de overlays distribuído).
  const overlaySeedKey = parsed.contextoGeral ?? `t2-${Date.now()}`

  // Sequencial pra preservar ordem de log + permitir cache pack entre slides.
  // (Slides do mesmo carrossel que reusam 'product-main' ganham do cache.)
  const results: SlideRenderResult[] = []
  for (const plan of plans) {
    const r = await renderOneSlideWithRetry({ plan, pack, uploadFn, overlaySeedKey })
    results.push(r)
  }

  return {
    results,
    pack: serializePack(pack),
    tookMs: Date.now() - startedAt,
    parserResults,
  }
}

// ─── renderSlideRegerar (Fase 4) ───────────────────────────────────────────

export interface RenderSlideRegerarResult {
  result: SlideRenderResult
  pack: CarouselAssetPack | null
}

export async function renderSlideRegerar(
  input: RegerarSlideInput,
  opts?: RenderM2T2Opts,
): Promise<RenderSlideRegerarResult> {
  regerarSlideInputSchema.parse(input)

  // 1. Aplica ajustePrompt no plan
  const ajustedPlan = _applyAjuste(input)

  // 2. Reusa o pack original e rehydrata buffers a partir das URLs persistidas
  //    (DEC-M2-013). Quando applyAjusteToPlan limpou packKey (regenerateAssets
  //    intent), a busca por packKey vai miss e regenera novo asset.
  const pack: CarouselAssetPackRuntime = input.packAssets
    ? {
        packHash: input.packAssets.packHash,
        createdAt: input.packAssets.createdAt,
        assets: { ...input.packAssets.assets },
        buffers: new Map(),
        totalCostUsd: 0,
      }
    : newPack(`regerar-${Date.now()}`)
  await rehydratePackBuffers(pack)

  const uploadFn = opts?.uploadFn ?? defaultUpload

  const result = await renderOneSlideWithRetry({ plan: ajustedPlan, pack, uploadFn })

  return {
    result,
    pack: serializePack(pack),
  }
}

// Re-export pra tooling externo se necessário.
export type { ImageSlot }
