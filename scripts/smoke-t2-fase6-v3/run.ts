/**
 * Smoke T2 Fase 6 v3 — Validação dos 4 fixes P0+P1
 *
 * Cobre 4 cenários, cada um stressando um dos fixes:
 *
 * Cenário 1 (BUG-M2-006): content_3 sem bullets + imagem → image-focus
 * Cenário 2 (BUG-M2-007): cta_final com texto numerado longo → title curto
 * Cenário 3 (MEL-M2-009): cover com title de 98 chars + imagem
 * Cenário 4 (MEL-M2-004): comparison-before-after com prefixo "same form"
 *
 * Cada cenário roda como carrossel próprio (cobre Planner real). O smoke
 * extrai o slide alvo de cada carrossel.
 *
 * Custo esperado: ~$1.50 (4 LLM parsings + 5-6 imagens IA).
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local scripts/smoke-t2-fase6-v3/run.ts
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { renderM2T2 } from '../../lib/m2/t2/render'
import type { T2Input } from '../../lib/m2/t2/types'

const OUT_DIR = path.join(process.cwd(), 'scripts', 'smoke-t2-fase6-v3', 'output')

async function localUploadFn(buffer: Buffer, key: string): Promise<string> {
  const safe = key.replace(/\//g, '_')
  const out = path.join(OUT_DIR, safe)
  await fs.writeFile(out, buffer)
  return `file://${out}`
}

interface Scenario {
  name: string
  fix: string
  description: string
  input: T2Input
  /** Slide do carrossel que vamos exportar como o "slide alvo". 0-indexed. */
  targetSlideIndex: number
  outputFilename: string
}

const SCENARIOS: Scenario[] = [
  // ─── Cenário 1: BUG-M2-006 — content sem bullets vira image-focus ─────────
  {
    name: 'cenario-1-image-focus',
    fix: 'BUG-M2-006',
    description: 'content_3 sem bullets + imagem → deve virar image-focus',
    input: {
      modo: 'carrossel',
      templateId: 'pipeline-hibrido-v2',
      logo: 'casinha',
      contextoGeral: 'cozinha limpa',
      modoGeracao: 'ia',
      slides: [
        {
          copyTexto: 'Texto: Você sabia disso?\nApoio: Vem ver.',
        },
        {
          copyTexto: `Texto: Botões do fogão. Acumulam gordura, poeira e resíduos das mãos.
Descrição da imagem: close-up de botões do fogão com sujeira acumulada nas laterais`,
        },
        {
          copyTexto: `Texto: Faça hoje.
CTA: COMEÇAR`,
        },
      ],
    },
    targetSlideIndex: 1,
    outputFilename: 'smoke-cenario-1-image-focus.png',
  },

  // ─── Cenário 2: BUG-M2-007 — cta_final com texto numerado longo ───────────
  {
    name: 'cenario-2-numerado-cta',
    fix: 'BUG-M2-007',
    description: 'cta_final numerado → title curto "3. Escorredor de louça" + subtitle longo',
    input: {
      modo: 'carrossel',
      templateId: 'pipeline-hibrido-v2',
      logo: 'casinha',
      contextoGeral: 'cozinha limpa',
      modoGeracao: 'ia',
      slides: [
        {
          copyTexto: 'Texto: 3 itens da cozinha\nApoio: pra prestar atenção',
        },
        {
          copyTexto: `Texto: 1. Botões do fogão. Eles acumulam gordura.
Descrição da imagem: stovetop knobs with grease buildup`,
        },
        {
          copyTexto: `Texto: 3. Escorredor de louça. Ele vive molhado e pode acumular limo, resíduos e manchas sem você perceber.
Apoio: Se a água fica parada, vira problema.
CTA: Compartilhe com uma amiga.`,
        },
      ],
    },
    targetSlideIndex: 2,
    outputFilename: 'smoke-cenario-2-numerado-cta.png',
  },

  // ─── Cenário 3: MEL-M2-009 — cover com title longo + image ────────────────
  {
    name: 'cenario-3-cover-longo',
    fix: 'MEL-M2-009',
    description: 'cover com title de 98 chars + image — deve caber sem cortar',
    input: {
      modo: 'carrossel',
      templateId: 'pipeline-hibrido-v2',
      logo: 'casinha',
      contextoGeral: 'limpeza cozinha',
      modoGeracao: 'ia',
      slides: [
        {
          copyTexto: `Texto: 3 itens da cozinha que você esquece de limpar e que podem te dar problemas
Apoio: Gordura, mau cheiro, bactérias e sujeira acumulada.
Descrição da imagem: ralo da pia da cozinha com restos de comida visíveis`,
        },
        {
          copyTexto: `Texto: Faça hoje.
CTA: COMEÇAR`,
        },
      ],
    },
    targetSlideIndex: 0,
    outputFilename: 'smoke-cenario-3-cover-longo.png',
  },

  // ─── Cenário 4: MEL-M2-004 — comparison "same form" ───────────────────────
  {
    name: 'cenario-4-comparison-same-form',
    fix: 'MEL-M2-004',
    description: 'comparison before/after — prefix força mesma forma do produto',
    input: {
      modo: 'carrossel',
      templateId: 'pipeline-hibrido-v2',
      logo: 'casinha',
      contextoGeral: 'troca de bucha',
      modoGeracao: 'ia',
      slides: [
        {
          copyTexto: 'Texto: Bucha velha vs nova\nApoio: a diferença',
        },
        {
          copyTexto: 'antes e depois',
          slideType: 'comparison',
          slots: {
            title: 'ANTES E DEPOIS DA TROCA',
            labelBefore: 'ANTES',
            labelAfter: 'DEPOIS',
            caption:
              'Troca semanal mantém a cozinha mais higiênica',
            imagePromptBefore: 'old worn dirty kitchen sponge, yellow body darkened, green scrubber faded with stains',
            imagePromptAfter: 'new clean kitchen sponge, vibrant yellow body, bright green scrubber on top',
          },
        },
        {
          copyTexto: `Texto: Faça hoje.
CTA: COMEÇAR`,
        },
      ],
    },
    targetSlideIndex: 1,
    outputFilename: 'smoke-cenario-4-comparison-same-form.png',
  },
]

async function main() {
  const startedAt = Date.now()
  await fs.mkdir(OUT_DIR, { recursive: true })
  console.log('[smoke-t2-fase6-v3] iniciando 4 cenários…\n')

  const reports: Array<{
    scenario: string
    fix: string
    targetSlideIndex: number
    qcScore: number
    qcPass: boolean
    parserResult?: unknown
    plannedSubtemplateId?: string
    tookMs: number
    cost: number
  }> = []

  for (const sc of SCENARIOS) {
    console.log(`━ ${sc.name} (${sc.fix})`)
    console.log(`  ${sc.description}`)
    const scStart = Date.now()
    const output = await renderM2T2(sc.input, { uploadFn: localUploadFn })
    const target = output.results[sc.targetSlideIndex]
    if (!target) {
      console.error(`  ✗ slide alvo ${sc.targetSlideIndex} não retornado`)
      continue
    }
    const localPath = target.url.replace(/^file:\/\//, '')
    await fs.copyFile(localPath, path.join(OUT_DIR, sc.outputFilename))
    console.log(
      `  ✓ slide ${sc.targetSlideIndex + 1}/${output.results.length} salvo · QC=${target.qc.qualityScore} · ${(Date.now() - scStart) / 1000}s`,
    )
    reports.push({
      scenario: sc.name,
      fix: sc.fix,
      targetSlideIndex: sc.targetSlideIndex,
      qcScore: target.qc.qualityScore,
      qcPass: target.qc.pass,
      parserResult: output.parserResults?.[sc.targetSlideIndex],
      plannedSubtemplateId: target.slideId, // SlideRenderResult não tem subtemplateId diretamente; slideId carrega
      tookMs: Date.now() - scStart,
      cost: 0, // estimado abaixo
    })
    console.log()
  }

  // Estimativa custo total: ~$0.001/LLM + ~$0.25/image (gpt-image-1 high)
  const totalLlm = reports.length // 1 LLM call por slide alvo (aproximado)
  const totalImage = reports.length + 1 // comparison usa 2, demais 1
  const totalCost = totalLlm * 0.001 + totalImage * 0.25

  const consolidated = {
    timestamp: new Date().toISOString(),
    totalTookMs: Date.now() - startedAt,
    estimatedCostUsd: Number(totalCost.toFixed(2)),
    scenarios: reports,
  }
  await fs.writeFile(
    path.join(OUT_DIR, 'qc-report.json'),
    JSON.stringify(consolidated, null, 2),
  )

  // Concentra os parserResults de TODOS os carrosséis num único log pra auditoria.
  await fs.writeFile(
    path.join(OUT_DIR, 'llm-parser-log.json'),
    JSON.stringify(consolidated, null, 2),
  )

  console.log('━ Resultado consolidado:')
  console.log(`  ${reports.length}/${SCENARIOS.length} cenários processados`)
  console.log(`  tempo total: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)
  console.log(`  custo estimado: ~$${totalCost.toFixed(2)}`)
  console.log(`  outputs: ${OUT_DIR}/`)

  const failed = reports.filter((r) => !r.qcPass).length
  if (failed > 0) {
    console.error(`\n[smoke-t2-fase6-v3] FAIL — ${failed} cenário(s) com QC fail`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[smoke-t2-fase6-v3] ERRO:', err)
  process.exit(1)
})
