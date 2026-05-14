import { LRUCache } from 'lru-cache'
import crypto from 'node:crypto'
import { brandM1 } from '@/lib/brand/m1.brand'
import type { M1TipoCapa } from './schema'

type CacheKey = string
type CachedSwatch = {
  swatchBuffer: Buffer
  createdAt: number
}

// Cache em memória — válido durante o lifetime da função serverless.
// Em Vercel, isso significa cache por instância "warm". Aceitável para
// uso real (equipe gera múltiplos cenários em sequência).
// TODO(M1): se latência cross-instance virar problema, migrar para Redis (Upstash) — REF-002.
const capaNeutraCache = new LRUCache<CacheKey, CachedSwatch>({
  max: brandM1.cache.capaNeutra.maxEntries,
  ttl: brandM1.cache.capaNeutra.ttlMinutes * 60 * 1000,
})

export function buildCacheKey(
  referenciaBlobUrl: string,
  tipoCapa: Exclude<M1TipoCapa, 'lisa'>
): CacheKey {
  // Hash da URL + tipoCapa garante cache key único e estável.
  return crypto
    .createHash('sha256')
    .update(`${referenciaBlobUrl}|${tipoCapa}`)
    .digest('hex')
    .slice(0, 16)
}

export function getCachedSwatch(key: CacheKey): Buffer | null {
  const cached = capaNeutraCache.get(key)
  return cached?.swatchBuffer ?? null
}

export function setCachedSwatch(key: CacheKey, swatchBuffer: Buffer): void {
  capaNeutraCache.set(key, { swatchBuffer, createdAt: Date.now() })
}

export function getCacheStats(): { size: number; max: number } {
  return { size: capaNeutraCache.size, max: capaNeutraCache.max }
}
