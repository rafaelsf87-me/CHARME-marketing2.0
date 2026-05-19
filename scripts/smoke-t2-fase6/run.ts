/**
 * Smoke T2 Fase 6 — Parser LLM + ImageSlots dinâmicos + alignItems fix
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local scripts/smoke-t2-fase6/run.ts
 *
 * Pré-requisitos: FAL_KEY em .env.local + BLOB_READ_WRITE_TOKEN (uploadFn
 * local salva no FS, não bate em Vercel Blob — REF-M2-001).
 *
 * O que cobre:
 * - Input bruto colado pelo user com labels meta "Texto / Apoio / Descrição
 *   da imagem / CTA" — parser LLM extrai title/subtitle/bullets/imagePrompt.
 * - 4 slides (cover + content_6 + comparison + cta_final).
 * - ImageSlot 'image-main' criado em cover, content-6 E cta-final (apenas
 *   onde LLM devolveu imagePrompt); comparison usa image-before/after.
 * - alignItems: center evita corte do título no topo.
 *
 * Outputs em scripts/smoke-t2-fase6/output/:
 * - smoke-slide-{1..4}.png
 * - qc-report.json (4 slides consolidado)
 * - llm-parser-log.json (input/output de cada chamada LLM pra auditoria)
 * - cost-report.json (custo LLM + IA)
 *
 * Custo esperado: ~$1.00-1.50 (4 LLM parsings ~$0.004 + 4 imagens
 * gpt-image-1 high ~$1.00 + cache reuso pra slide cta-final sem imagem).
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { renderM2T2 } from '../../lib/m2/t2/render'
import type { T2Input } from '../../lib/m2/t2/types'

const OUT_DIR = path.join(process.cwd(), 'scripts', 'smoke-t2-fase6', 'output')

async function localUploadFn(buffer: Buffer, key: string): Promise<string> {
  const safe = key.replace(/\//g, '_')
  const out = path.join(OUT_DIR, safe)
  await fs.writeFile(out, buffer)
  // URL fake mas válida (renderSlideRegerar usa pra fetch; aqui não regera)
  return `file://${out}`
}

async function main() {
  const startedAt = Date.now()
  await fs.mkdir(OUT_DIR, { recursive: true })

  console.log('[smoke-t2-fase6] iniciando…')

  // Input bruto: simula roteiro estruturado humano com labels meta
  // (idem ao smoke prod 3 que reprovou na Fase 5, agora deveria passar).
  const input: T2Input = {
    modo: 'carrossel',
    templateId: 'pipeline-hibrido-v2',
    logo: 'casinha',
    contextoGeral: 'itens da cozinha por até R$10',
    modoGeracao: 'ia',
    slides: [
      // Slide 1 — cover
      {
        copyTexto: `Texto: 3 ITENS DA COZINHA POR ATÉ R$10
Apoio: dicas que valem o investimento
Descrição da imagem: top-down de bancada de mármore branco com três produtos de limpeza dispostos lado a lado, iluminação clara natural`,
      },
      // Slide 2 — content_6 (LLM deveria identificar lista)
      {
        copyTexto: `Texto: O QUE TROCAR AGORA
Bullet: Bucha amarela com esfregão verde
Bullet: Esponja de aço fina
Bullet: Pano de microfibra
Bullet: Detergente neutro 500ml
Bullet: Sabão de coco em barra
Bullet: Toalha de tecido para louça
Descrição da imagem: produtos de limpeza modernos sobre fundo neutro claro`,
        slideType: 'content_6',
      },
      // Slide 3 — comparison (mantém heurística atual, não chama parser)
      {
        copyTexto: 'Bucha velha vs bucha nova',
        slideType: 'comparison',
        slots: {
          title: 'ANTES E DEPOIS DA TROCA',
          labelBefore: 'ANTES',
          labelAfter: 'DEPOIS',
          caption:
            'Trocar a bucha toda semana ajuda a manter a cozinha mais limpa e higiênica',
          imagePromptBefore:
            'old worn dirty kitchen sponge, yellow body darkened, green scrubber faded with stains, common Brazilian dish sponge',
          imagePromptAfter:
            'new clean kitchen sponge, vibrant yellow body, bright green scrubber on top, common Brazilian dish sponge',
        },
      },
      // Slide 4 — cta_final
      {
        copyTexto: `Texto: APROVEITE A PROMOÇÃO
Apoio: Itens em estoque limitado
CTA: COMPRAR AGORA`,
      },
    ],
  }

  console.log('[smoke-t2-fase6] chamando renderM2T2 (parser LLM + IA)…')
  const output = await renderM2T2(input, { uploadFn: localUploadFn })

  // Persiste resultados
  for (const result of output.results) {
    const localPath = result.url.replace(/^file:\/\//, '')
    const dest = path.join(
      OUT_DIR,
      `smoke-slide-${result.slideIndex + 1}.png`,
    )
    await fs.copyFile(localPath, dest)
    console.log(
      `  ✓ slide ${result.slideIndex + 1}/${output.results.length} salvo — QC score=${result.qc.qualityScore} (${result.qc.errors.length} err / ${result.qc.warnings.length} warn)`,
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

  // LLM parser log
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

  // Cost report
  const llmCalls = output.parserResults?.length ?? 0
  const llmCostUsd = llmCalls * 0.001 // estimativa generosa Haiku 4.5
  const imageCalls = output.results.reduce((s, r) => {
    return s + (r.slideId.includes('slide-3') ? 2 : 1) // comparison usa 2
  }, 0)
  const imageCostUsd = imageCalls * 0.25 // gpt-image-1 high ~$0.25/img
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
  console.log(`\n[smoke-t2-fase6] OK em ${tookSec}s`)
  console.log(`  consolidated QC pass: ${qcReport.consolidated.pass}`)
  console.log(`  avg score: ${qcReport.consolidated.avgScore.toFixed(1)}/100`)
  console.log(`  LLM calls: ${llmCalls} (~$${llmCostUsd.toFixed(3)})`)
  console.log(`  Image calls: ${imageCalls} (~$${imageCostUsd.toFixed(2)})`)
  console.log(`  Total cost: ~$${(llmCostUsd + imageCostUsd).toFixed(2)}`)
  console.log(`  outputs: ${OUT_DIR}/`)

  if (!qcReport.consolidated.pass) {
    console.error('\n[smoke-t2-fase6] FAIL — QC consolidado falhou em pelo menos 1 slide')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[smoke-t2-fase6] ERRO:', err)
  process.exit(1)
})
