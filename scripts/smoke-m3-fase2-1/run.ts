/**
 * Smoke M3 Sub-Fase 2.1 — generateAtriz() end-to-end (Flux + rembg).
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local scripts/smoke-m3-fase2-1/run.ts
 *
 * Pré-requisitos em .env.local:
 *   - FAL_KEY
 *
 * Objetivo: validar pipeline da atriz (lib/m3/atriz.ts) end-to-end com 3
 * configurações de detalhes diferentes. Modo Upload não roda no smoke (sem
 * arquivo real disponível) — testado em UI/uso real na Fase 3.
 *
 * Output: 3 PNGs em scripts/smoke-m3-fase2-1/output/atriz-{1,2,3}.png
 *
 * Custo esperado: ~$0.30 (3 × $0.06 Flux Pro v1.1 Ultra + 3 × $0.005 rembg
 * + upload temporário do FAL storage — sem custo direto).
 *
 * IMPORTANTE: rodar apenas com autorização explícita do Rafael (custo real $).
 */

import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { generateAtriz, type GenerateAtrizArgs } from '@/lib/m3/atriz'

interface TestSpec {
  id: 1 | 2 | 3
  label: string
  args: GenerateAtrizArgs
}

const TESTS: TestSpec[] = [
  {
    id: 1,
    label: 'sem detalhes (prompt base puro)',
    args: { modo: 'ia' },
  },
  {
    id: 2,
    label: 'cabelo longo castanho ondulado',
    args: { modo: 'ia', detalhes: 'Long wavy brown hair flowing past shoulders.' },
  },
  {
    id: 3,
    label: 'negra, cabelo cacheado natural',
    args: {
      modo: 'ia',
      detalhes: 'Black woman with natural curly afro hair, beautiful warm skin tone.',
    },
  },
]

interface CornerSample { tl: number; tr: number; bl: number; br: number }

async function sampleAlphaCorners(buf: Buffer): Promise<CornerSample> {
  const img = sharp(buf)
  const meta = await img.metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  const alpha = await img.extractChannel('alpha').raw().toBuffer()
  return {
    tl: alpha[0] ?? -1,
    tr: alpha[w - 1] ?? -1,
    bl: alpha[(h - 1) * w] ?? -1,
    br: alpha[h * w - 1] ?? -1,
  }
}

async function runOne(spec: TestSpec): Promise<{ took: number; bytes: number; outPath: string; alpha: CornerSample; source: string }> {
  console.log(`\n──── Teste ${spec.id} — ${spec.label} ────`)
  const t0 = Date.now()
  const { png, source } = await generateAtriz(spec.args)
  const took = Date.now() - t0

  const outDir = path.resolve(process.cwd(), 'scripts/smoke-m3-fase2-1/output')
  const outPath = path.join(outDir, `atriz-${spec.id}.png`)
  await writeFile(outPath, png)

  const alpha = await sampleAlphaCorners(png)
  const meta = await sharp(png).metadata()

  console.log(`[generateAtriz] ${took}ms · source=${source}`)
  console.log(`[saved] ${outPath} (${(png.length / 1024).toFixed(1)} KB · ${meta.width}x${meta.height})`)
  console.log(`[alpha corners] TL=${alpha.tl} TR=${alpha.tr} BL=${alpha.bl} BR=${alpha.br} (0 = transparente real)`)

  return { took, bytes: png.length, outPath, alpha, source }
}

async function main() {
  console.log('═════════ Smoke M3 Sub-Fase 2.1 — generateAtriz() ═════════')
  console.log('Pipeline: lib/m3/atriz.ts → callFluxAtriz (Flux Pro v1.1 Ultra) → callRembg')
  console.log('Aspect: 3:4 (portrait) · safety_tolerance 6 (evita false-positive NSFW)')
  console.log('Custo estimado: ~$0.30 (3 × $0.06 Flux + 3 × $0.005 rembg)')
  console.log('────────────────────────────────────────────────────────────')

  if (!process.env.FAL_KEY) throw new Error('FAL_KEY ausente em .env.local')

  const results: Array<{ id: number; label: string; took: number; bytes: number; outPath: string; alpha: CornerSample; source: string }> = []
  for (const spec of TESTS) {
    const r = await runOne(spec)
    results.push({ id: spec.id, label: spec.label, ...r })
  }

  console.log('\n═════════ RESUMO ═════════')
  let allTransparent = true
  for (const r of results) {
    const transp = [r.alpha.tl, r.alpha.tr, r.alpha.bl, r.alpha.br].some((a) => a === 0)
    if (!transp) allTransparent = false
    console.log(`Atriz ${r.id} — ${r.label}: ${r.took}ms · ${(r.bytes / 1024).toFixed(1)} KB · ${transp ? 'alpha OK ✓' : 'alpha SUSPEITO ✗'}`)
    console.log(`  → ${r.outPath}`)
  }
  if (!allTransparent) {
    console.warn('\n⚠️  ALGUMA atriz não tem alpha=0 nos 4 cantos — rembg pode ter falhado em isolar o sujeito.')
  } else {
    console.log('\n✓ Transparência real confirmada nas 3 atrizes.')
  }
  console.log(`\nCusto aprox: $0.30 (3 × $0.065)`)
  console.log('═══════════════════════════════════════════════════════════════════')
}

main().catch((err) => {
  console.error('FALHOU:', err)
  process.exit(1)
})
