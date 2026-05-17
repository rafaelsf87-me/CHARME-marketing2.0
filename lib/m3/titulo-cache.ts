// Cache em memória de títulos gerados. Chave = texto normalizado (uppercase
// + trim). Banner é mensal, regeneração da mesma promo é caso comum — cache
// economiza ~$0.22/hit (ver DEC-M3-002 em DIVIDAS).
//
// Limitação aceita Fase 1: cache zera quando o processo morre (dev server
// restart, deploy Vercel, função serverless cold start). Persistência via
// Vercel Blob ou KV fica pra Fase 2/3 se padrão de uso justificar.

const cache = new Map<string, Buffer>()

export function normalizeTituloKey(texto: string): string {
  return texto.trim().toUpperCase()
}

export function getTituloCached(texto: string): Buffer | undefined {
  return cache.get(normalizeTituloKey(texto))
}

export function setTituloCache(texto: string, png: Buffer): void {
  cache.set(normalizeTituloKey(texto), png)
}

export function clearTituloCache(): void {
  cache.clear()
}

export function tituloCacheSize(): number {
  return cache.size
}
