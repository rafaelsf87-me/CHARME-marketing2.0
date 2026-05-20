/**
 * V2 Tipografia — buckets char-count → font-size
 *
 * Spec consolidada V2.0:
 *  - Título XXG (≤25): 140px
 *  - Título XG (26-40): 110px
 *  - Título G  (41-55): 85px
 *  - Bullet Curto (≤15): 42px
 *  - Bullet Médio (16-28): 36px
 *  - Bullet Longo (29-45): 30px
 *
 * Code pode ajustar ±10% via auto-fit pra evitar overflow.
 */

export interface BucketResult {
  fontSize: number
  bucket: string
  adjusted: boolean
}

const TITULO_BUCKETS: Array<{ max: number; size: number; label: string }> = [
  { max: 25, size: 140, label: 'XXG' },
  { max: 40, size: 110, label: 'XG' },
  { max: 55, size: 85, label: 'G' },
]

const BULLET_BUCKETS: Array<{ max: number; size: number; label: string }> = [
  { max: 15, size: 42, label: 'Curto' },
  { max: 28, size: 36, label: 'Médio' },
  { max: 45, size: 30, label: 'Longo' },
]

export function bucketForTitulo(charCount: number): BucketResult {
  for (const b of TITULO_BUCKETS) {
    if (charCount <= b.max) return { fontSize: b.size, bucket: b.label, adjusted: false }
  }
  // Overflow do bucket G — shrink 10% como permitido pela spec.
  return { fontSize: Math.round(85 * 0.9), bucket: 'G (-10%)', adjusted: true }
}

export function bucketForBullet(charCount: number): BucketResult {
  for (const b of BULLET_BUCKETS) {
    if (charCount <= b.max) return { fontSize: b.size, bucket: b.label, adjusted: false }
  }
  return { fontSize: Math.round(30 * 0.9), bucket: 'Longo (-10%)', adjusted: true }
}

/** Soma de chars do título + todos os bullets pra decisão CURTA vs LONGA. */
export function totalCharCount(titulo: string, bullets: string[]): number {
  return titulo.length + bullets.reduce((sum, b) => sum + b.length, 0)
}
