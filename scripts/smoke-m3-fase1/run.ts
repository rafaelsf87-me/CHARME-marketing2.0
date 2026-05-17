/**
 * Smoke M3 Fase 1 — generateTitulo() end-to-end isolado.
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local scripts/smoke-m3-fase1/run.ts
 *
 * Pré-requisitos em .env.local:
 *   - FAL_KEY
 *
 * Objetivo: validar pipeline do título do M3 (lib/m3/titulo.ts) — orquestrador
 * + cache + buildTituloPrompt + callGptImage1Title — com 3 textos PT-BR.
 *
 * Output: 3 PNGs em scripts/smoke-m3-fase1/output/teste-{1,2,3}.png
 *
 * Custo esperado: ~$0.40-0.60 se cache miss em todos (3 × ~$0.20). Cache é em
 * memória do processo — sempre miss em run novo.
 *
 * IMPORTANTE: rodar apenas com autorização explícita do Rafael (custo real $).
 */

import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { generateTitulo } from '@/lib/m3/titulo'
import { tituloCacheSize } from '@/lib/m3/titulo-cache'

interface TestSpec {
  id: 1 | 2 | 3
  texto: string
}

const TESTS: TestSpec[] = [
  { id: 1, texto: 'DESCONTÃO DE MÃE' },
  { id: 2, texto: 'BOTA FORA CHARME' },
  { id: 3, texto: 'SAÍDEIRA 2024' },
]

async function runOne(spec: TestSpec): Promise<{ took: number; hit: boolean; bytes: number; outPath: string }> {
  console.log(`\n──── Teste ${spec.id} — "${spec.texto}" ────`)
  const t0 = Date.now()
  const { png, cacheHit, textoNormalizado } = await generateTitulo({ texto: spec.texto })
  const took = Date.now() - t0

  const outDir = path.resolve(process.cwd(), 'scripts/smoke-m3-fase1/output')
  const outPath = path.join(outDir, `teste-${spec.id}.png`)
  await writeFile(outPath, png)

  console.log(`[generateTitulo] ${took}ms · ${cacheHit ? 'CACHE HIT' : 'cache miss'} · key="${textoNormalizado}"`)
  console.log(`[saved] ${outPath} (${(png.length / 1024).toFixed(1)} KB)`)

  return { took, hit: cacheHit, bytes: png.length, outPath }
}

async function main() {
  console.log('═════════ Smoke M3 Fase 1 — generateTitulo() ═════════')
  console.log('Pipeline: lib/m3/titulo.ts → fal-client + cache + template atual-maio26')
  console.log('Endpoint: fal-ai/gpt-image-1/text-to-image · high · 1536x1024 · transparent')
  console.log('Custo estimado: ~$0.40-0.60 (3 cache miss)')
  console.log('Cache: in-memory (resetado todo run novo)')
  console.log('────────────────────────────────────────────────────────')

  if (!process.env.FAL_KEY) throw new Error('FAL_KEY ausente em .env.local')

  const results: Array<{ id: number; texto: string; took: number; hit: boolean; bytes: number; outPath: string }> = []
  for (const spec of TESTS) {
    const r = await runOne(spec)
    results.push({ id: spec.id, texto: spec.texto, ...r })
  }

  // Validação extra do cache: 2ª chamada do teste 1 deve hit.
  console.log('\n──── Validação cache: re-chamada de "DESCONTÃO DE MÃE" ────')
  const t0 = Date.now()
  const { cacheHit } = await generateTitulo({ texto: 'DESCONTÃO DE MÃE' })
  const took = Date.now() - t0
  console.log(`[generateTitulo] ${took}ms · ${cacheHit ? 'CACHE HIT ✓' : 'CACHE MISS ✗ (BUG!)'}`)
  if (!cacheHit) throw new Error('Cache falhou: 2ª chamada do mesmo texto deveria hit')

  console.log('\n═════════ RESUMO ═════════')
  const totalCost = results.filter((r) => !r.hit).length * 0.2
  for (const r of results) {
    console.log(`Teste ${r.id} — "${r.texto}": ${r.took}ms · ${r.hit ? 'HIT' : 'MISS'} · ${(r.bytes / 1024).toFixed(1)} KB`)
    console.log(`  → ${r.outPath}`)
  }
  console.log(`\nCache atual: ${tituloCacheSize()} item(s)`)
  console.log(`Custo aprox: $${totalCost.toFixed(2)} (${results.filter((r) => !r.hit).length} cache miss × ~$0.20)`)
  console.log('═══════════════════════════════════════════════════════════════════')
}

main().catch((err) => {
  console.error('FALHOU:', err)
  process.exit(1)
})
