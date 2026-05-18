/**
 * T2 Carousel Asset Pack — cache em memória por-request
 *
 * Estado: STUB (Fase 0). Implementação na Fase 3.
 *
 * Invariante I5: vive 1 request. Nunca persiste em disco ou Blob.
 *
 * Uso (Fase 3):
 *   const pack = newPack(contextoGeral, produtoDescrito)
 *   const existing = pack.assets['product-main']
 *   if (!existing) {
 *     const { url, promptHash } = await generateProductAsset({ prompt, promptHash })
 *     addAsset(pack, 'product-main', { url, promptHash, assetType: 'product', transparent: true })
 *   }
 */

import type { AssetPackEntry, CarouselAssetPack } from '../types'

export function newPack(_packHashSource: string): CarouselAssetPack {
  throw new Error('[T2] cache.newPack — Fase 3 não implementada')
}

export function addAsset(
  _pack: CarouselAssetPack,
  _key: string,
  _entry: AssetPackEntry,
): void {
  throw new Error('[T2] cache.addAsset — Fase 3 não implementada')
}

export function findAsset(_pack: CarouselAssetPack | null, _key: string): AssetPackEntry | null {
  throw new Error('[T2] cache.findAsset — Fase 3 não implementada')
}
