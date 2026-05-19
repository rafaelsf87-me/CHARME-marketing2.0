/**
 * Smoke T2 Fase 6 v2 — Fix CRÍTICO fundo branco + gap vertical + anti-invenção
 *
 * Input REAL colado pelo Rafael (não inventar):
 *   Tema: "3 itens da cozinha que você esquece de limpar e pode te dar
 *   problemas" — botões do fogão, ralo da pia, escorredor de louça.
 *
 * Cobre:
 * - FIX 1: PRODUCT_PROMPT_TEMPLATE bloqueia menções a background/marble/etc.
 *   gpt-image-1 deve devolver produto isolado em fundo transparente.
 * - FIX 2: gap vertical comprimido (step 148→112) no content-6-boxes.
 * - FIX 3: LLM não inventa preços/promoções não mencionados no input.
 *
 * Outputs em scripts/smoke-t2-fase6-v2/output/:
 * - smoke-slide-{1..4}.png
 * - qc-report.json
 * - llm-parser-log.json
 * - cost-report.json
 *
 * Custo esperado: ~$1.25 (similar ao v1).
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { renderM2T2 } from '../../lib/m2/t2/render'
import type { T2Input } from '../../lib/m2/t2/types'

const OUT_DIR = path.join(process.cwd(), 'scripts', 'smoke-t2-fase6-v2', 'output')

async function localUploadFn(buffer: Buffer, key: string): Promise<string> {
  const safe = key.replace(/\//g, '_')
  const out = path.join(OUT_DIR, safe)
  await fs.writeFile(out, buffer)
  return `file://${out}`
}

async function main() {
  const startedAt = Date.now()
  await fs.mkdir(OUT_DIR, { recursive: true })

  console.log('[smoke-t2-fase6-v2] iniciando…')

  // Input EXATO colado pelo Rafael no briefing.
  const input: T2Input = {
    modo: 'carrossel',
    templateId: 'pipeline-hibrido-v2',
    logo: 'casinha',
    contextoGeral: '3 itens da cozinha que você esquece de limpar e pode te dar problemas',
    modoGeracao: 'ia',
    slides: [
      // Slide 1 — cover
      {
        copyTexto: `Texto: 3 itens da cozinha que você esquece de limpar e que podem te dar problemas
Apoio: Gordura, mau cheiro, bactérias e sujeira acumulada onde muita gente nem percebe.
Descrição da imagem: Cozinha bonita e aparentemente limpa, mas com 3 áreas destacadas com círculos ou setas: botão/manípulo do fogão, ralo da pia, escorredor de louça. Visual de atenção, mostrando que existe sujeira escondida.`,
      },
      // Slide 2 — content
      {
        copyTexto: `Texto: 1. Botões do fogão. Eles acumulam gordura, poeira e resíduos das mãos o tempo todo.
Apoio: Mesmo quando o fogão parece limpo, os manípulos podem estar cheios de sujeira difícil de enxergar.
Descrição da imagem: Close nos botões do fogão com aspecto de gordura ou sujeira acumulada nas laterais.`,
      },
      // Slide 3 — content (ralo da pia)
      {
        copyTexto: `Texto: 2. Ralo da pia. É um dos pontos que mais juntam restos de comida, gordura e mau cheiro.
Apoio: Se não limpar com frequência, vira um foco de sujeira e odor desagradável na cozinha.
Descrição da imagem: Pia de cozinha com destaque no ralo, mostrando restos de comida ou aspecto de sujeira acumulada.`,
      },
      // Slide 4 — cta_final
      {
        copyTexto: `Texto: 3. Escorredor de louça. Ele vive molhado e pode acumular limo, resíduos e manchas sem você perceber.
Apoio: Se a água fica parada, o escorredor deixa de ajudar e começa a virar problema.
CTA: Curtiu? Compartilhe com uma amiga que ama casa limpa e organizada.`,
      },
    ],
  }

  console.log('[smoke-t2-fase6-v2] chamando renderM2T2 (parser LLM + IA)…')
  const output = await renderM2T2(input, { uploadFn: localUploadFn })

  for (const result of output.results) {
    const localPath = result.url.replace(/^file:\/\//, '')
    const dest = path.join(OUT_DIR, `smoke-slide-${result.slideIndex + 1}.png`)
    await fs.copyFile(localPath, dest)
    console.log(
      `  ✓ slide ${result.slideIndex + 1}/${output.results.length} — QC=${result.qc.qualityScore} (${result.qc.errors.length}e/${result.qc.warnings.length}w)`,
    )
  }

  const qcReport = {
    timestamp: new Date().toISOString(),
    tookMs: output.tookMs,
    slides: output.results.map((r) => ({
      slideIndex: r.slideIndex,
      slideId: r.slideId,
      qcPass: r.qc.pass,
      qualityScore: r.qc.qualityScore,
      errors: r.qc.errors,
      warnings: r.qc.warnings,
    })),
    consolidated: {
      pass: output.results.every((r) => r.qc.pass),
      avgScore:
        output.results.reduce((s, r) => s + r.qc.qualityScore, 0) /
        output.results.length,
      totalErrors: output.results.reduce((s, r) => s + r.qc.errors.length, 0),
      totalWarnings: output.results.reduce((s, r) => s + r.qc.warnings.length, 0),
    },
  }
  await fs.writeFile(
    path.join(OUT_DIR, 'qc-report.json'),
    JSON.stringify(qcReport, null, 2),
  )

  await fs.writeFile(
    path.join(OUT_DIR, 'llm-parser-log.json'),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalCalls: output.parserResults?.length ?? 0,
        results: output.parserResults,
      },
      null,
      2,
    ),
  )

  const llmCalls = output.parserResults?.length ?? 0
  const llmCostUsd = llmCalls * 0.001
  // Estimativa: 1 cover + 1 content + 1 content + 1 cta_final (sem image) = 3 IA calls.
  // Mas se cta_final ganhar imagePrompt do LLM, vira 4.
  const imageCalls = output.results.filter((r) => r.qc.qualityScore > 0).length
  const imageCostUsd = imageCalls * 0.25
  await fs.writeFile(
    path.join(OUT_DIR, 'cost-report.json'),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        llmCalls,
        llmCostUsd: Number(llmCostUsd.toFixed(4)),
        imageCalls,
        imageCostUsd: Number(imageCostUsd.toFixed(2)),
        totalCostUsd: Number((llmCostUsd + imageCostUsd).toFixed(2)),
        tookMs: output.tookMs,
      },
      null,
      2,
    ),
  )

  const tookSec = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`\n[smoke-t2-fase6-v2] OK em ${tookSec}s`)
  console.log(`  consolidated QC pass: ${qcReport.consolidated.pass}`)
  console.log(`  avg score: ${qcReport.consolidated.avgScore.toFixed(1)}/100`)
  console.log(`  LLM calls: ${llmCalls} (~$${llmCostUsd.toFixed(3)})`)
  console.log(`  Image calls (est): ${imageCalls} (~$${imageCostUsd.toFixed(2)})`)
  console.log(`  outputs: ${OUT_DIR}/`)

  if (!qcReport.consolidated.pass) {
    console.error('\n[smoke-t2-fase6-v2] FAIL — QC consolidado falhou')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[smoke-t2-fase6-v2] ERRO:', err)
  process.exit(1)
})
