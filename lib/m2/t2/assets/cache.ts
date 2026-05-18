/**
 * T2 CarouselAssetPack — cache em memória por-request (DEC-M2-007, I5)
 *
 * Reusa produto principal entre slides do mesmo carrossel. Vida útil = 1
 * request. Nunca persiste em disco/Blob.
 *
 * Estrutura:
 *   - packHash: identifica o carrossel (sha256 do contextoGeral)
 *   - assets: Map<packKey, AssetPackEntry>
 *   - buffers: Map<packKey, Buffer> — buffer real pronto pra compose
 *
 * Uso típico no render.ts:
 *   const pack = newPack(contextoGeral)
 *   for (const plan of plans) {
 *     for (const slot of plan.imageSlots) {
 *       if (slot.source === 'reused-from-pack' && slot.packKey) {
 *         const cached = findAsset(pack, slot.packKey)
 *         if (cached) continue // reusa
 *       }
 *       if (slot.source === 'ai_generated' && slot.ai?.prompt) {
 *         const { buffer, promptHash, costUsd } = await generateProductAsset(...)
 *         addAsset(pack, slot.id, { buffer, url: '', promptHash, ... })
 *       }
 *     }
 *   }
 */

import crypto from 'node:crypto'
import type { AssetPackEntry, CarouselAssetPack } from '../types'

export interface CarouselAssetPackRuntime extends CarouselAssetPack {
  /** Buffers reais. Não serializado, vive só em runtime. */
  buffers: Map<string, Buffer>
  /** Custo acumulado em USD. */
  totalCostUsd: number
}

export function newPack(packHashSource: string): CarouselAssetPackRuntime {
  const packHash = crypto.createHash('sha256').update(packHashSource).digest('hex').slice(0, 16)
  return {
    packHash,
    createdAt: new Date().toISOString(),
    assets: {},
    buffers: new Map(),
    totalCostUsd: 0,
  }
}

export interface AddAssetArgs {
  packKey: string
  entry: AssetPackEntry
  buffer: Buffer
  costUsd: number
}

export function addAsset(pack: CarouselAssetPackRuntime, args: AddAssetArgs): void {
  pack.assets[args.packKey] = args.entry
  pack.buffers.set(args.packKey, args.buffer)
  pack.totalCostUsd += args.costUsd
}

export function findAsset(
  pack: CarouselAssetPackRuntime | null,
  packKey: string,
): { entry: AssetPackEntry; buffer: Buffer } | null {
  if (!pack) return null
  const entry = pack.assets[packKey]
  const buffer = pack.buffers.get(packKey)
  if (!entry || !buffer) return null
  return { entry, buffer }
}

/** Helper pra serializar o pack pro client (sem buffers). */
export function serializePack(pack: CarouselAssetPackRuntime): CarouselAssetPack {
  return {
    packHash: pack.packHash,
    createdAt: pack.createdAt,
    assets: pack.assets,
  }
}
