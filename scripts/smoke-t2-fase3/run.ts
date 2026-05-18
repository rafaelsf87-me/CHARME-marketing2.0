/**
 * Smoke T2 Fase 3 — pipeline completo com IA isolada (gpt-image-1 high)
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local scripts/smoke-t2-fase3/run.ts
 *
 * Pré-requisito: FAL_KEY em .env.local.
 *
 * O que faz:
 * - Carrega T2Input com 4 slides (cover + content-6 + comparison + cta-final)
 * - Slide 3 (comparison) tem imageSlots ai_generated com prompts distintos
 *   (sponge antes / sponge depois) — 2 chamadas gpt-image-1 high
 * - Render completo via renderM2T2 com uploadFn local (salva no FS),
 *   contornando REF-M2-001 (Vercel Blob privado em dev)
 *
 * Outputs:
 * - scripts/smoke-t2-fase3/output/smoke-slide-{1..4}.png
 * - scripts/smoke-t2-fase3/output/qc-report.json (consolidado + custos)
 * - scripts/smoke-t2-fase3/output/assets/*.png (intermediários — inspecionar
 *   antes do compose)
 *
 * Custo esperado: ~$0.50 (2 assets gpt-image-1 high) + ~$0.01 se rembg
 * fallback for acionado.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { renderM2T2 } from '../../lib/m2/t2/render'
import type { T2Input } from '../../lib/m2/t2/types'

const OUT_DIR = path.join(process.cwd(), 'scripts', 'smoke-t2-fase3', 'output')

async function main() {
  const startedAt = Date.now()
  await fs.mkdir(OUT_DIR, { recursive: true })

  console.log('[smoke-t2-fase3] iniciando…')

  const input: T2Input = {
    modo: 'carrossel',
    templateId: 't2-fase3-smoke',
    logo: 'casinha',
    contextoGeral: 'bucha de cozinha',
    slides: [
      // Slide 1 — cover
      {
        copyTexto:
          'SUA BUCHA PODE ESTAR SUJANDO MAIS DO QUE LIMPANDO\n\nVeja quando trocar a esponja de lavar louça',
        slideType: 'cover',
      },
      // Slide 2 — content-6-boxes
      {
        copyTexto: 'lista de sinais',
        slideType: 'content_6',
        slots: { title: 'TROQUE QUANDO ELA ESTIVER ASSIM:' },
        bullets: [
          'Amarelada, escura ou com manchas',
          'Com cheiro ruim',
          'Mole demais ou esfarelando',
          'Com restos de comida presos',
          'Gordurosa ou grudenta ao toque',
          'Com aparência velha e deformada',
        ],
      },
      // Slide 3 — comparison-before-after com 2 assets IA reais
      {
        copyTexto: 'bucha nova muda a sensação da cozinha',
        slideType: 'comparison',
        slots: {
          title: 'BUCHA NOVA MUDA A SENSAÇÃO DA COZINHA',
          labelBefore: 'ANTES',
          labelAfter: 'DEPOIS',
          caption:
            'Trocar a bucha com frequência ajuda a deixar a louça mais limpa e a cozinha mais higiênica',
          imagePromptBefore:
            'old worn dirty kitchen sponge, yellow body darkened, green scrubber faded with stains, common Brazilian dish sponge',
          imagePromptAfter:
            'new clean kitchen sponge, vibrant yellow body, bright green scrubber on top, common Brazilian dish sponge',
        },
      },
      // Slide 4 — cta-final
      {
        copyTexto: 'troque com frequência',
        slideType: 'cta_final',
        slots: {
          title: 'TROQUE COM FREQUÊNCIA',
          subtitle: 'A cada 7 a 15 dias',
          cta: 'CONHEÇA NA LOJA',
        },
      },
    ],
  }

  // uploadFn local — salva no FS pra contornar REF-M2-001 (Blob privado em dev).
  async function uploadLocal(buffer: Buffer, key: string): Promise<string> {
    const localPath = path.join(OUT_DIR, key.replace(/\//g, '_'))
    await fs.writeFile(localPath, buffer)
    return `file://${localPath}`
  }

  // Render end-to-end
  const renderStart = Date.now()
  const output = await renderM2T2(input, { uploadFn: uploadLocal })
  const renderMs = Date.now() - renderStart

  // Salva PNGs por slide (já estão no FS via uploadLocal — só reescrever
  // com nome canônico)
  // O upload já salvou em key m2-t2/<ts>-slide-N.png — vamos copiar pra nomes
  // estáveis.
  for (const r of output.results) {
    const sourceUrl = r.url.replace(/^file:\/\//, '')
    const dest = path.join(OUT_DIR, `smoke-${r.slideId}.png`)
    await fs.copyFile(sourceUrl, dest)
  }

  // Salva pack assets pra inspeção
  // Pack expõe entries (sem buffers serializados). Buffers ficaram em memória.

  // QC report consolidado
  const allPass = output.results.every((r) => r.qc.pass)
  const avgScore =
    output.results.reduce((sum, r) => sum + r.qc.qualityScore, 0) / output.results.length

  const costReport = {
    totalUsd: output.pack ? Object.keys(output.pack.assets).length * 0.25 : 0,
    assets: output.pack?.assets ?? {},
  }

  await fs.writeFile(
    path.join(OUT_DIR, 'qc-report.json'),
    JSON.stringify(
      {
        results: output.results,
        pack: output.pack,
        summary: {
          allPass,
          avgScore,
          totalMs: Date.now() - startedAt,
          renderMs,
        },
        cost: costReport,
      },
      null,
      2,
    ),
  )

  console.log('')
  console.log('━'.repeat(60))
  console.log(`✓ Smoke T2 Fase 3 ${allPass ? 'OK' : 'FAIL'} em ${Date.now() - startedAt}ms`)
  console.log(`  Slides:                 ${output.results.length}`)
  console.log(`  All pass:               ${allPass}`)
  console.log(`  Avg quality score:      ${avgScore.toFixed(1)}`)
  console.log(`  Render time:            ${renderMs}ms`)
  console.log(`  Output dir:             ${OUT_DIR}`)
  console.log(`  Custo estimado (IA):    ~$${costReport.totalUsd.toFixed(2)}`)
  console.log('━'.repeat(60))

  for (const r of output.results) {
    console.log(
      `  · ${r.slideId} qc.pass=${r.qc.pass} score=${r.qc.qualityScore} errors=${r.qc.errors.length} warnings=${r.qc.warnings.length}`,
    )
    for (const e of r.qc.errors) console.log(`      ERROR ${e.code}: ${e.message}`)
    for (const w of r.qc.warnings) console.log(`      WARN  ${w.code}: ${w.message}`)
  }

  if (!allPass) process.exit(1)
}

main().catch((err) => {
  console.error('[smoke-t2-fase3] FAIL:', err)
  process.exit(1)
})
