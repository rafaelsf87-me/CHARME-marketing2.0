/**
 * Smoke T2 Fase 2 — Planner + 4 subtemplates (cover + content-6 + comparison)
 *
 * Uso:
 *   pnpm tsx scripts/smoke-t2-fase2/run.ts
 *
 * Por enquanto roda 3 slides (cover + content-6-boxes + comparison-before-after)
 * já que cta-final-bg-01.png ainda não foi criado pelo Rafael.
 *
 * Quando o asset existir, basta adicionar entry no catalog.ts e o Planner
 * automaticamente passa a usar cta-final-bg-01 no último slide.
 *
 * Sem IA, $0 de custo.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { composeSlide } from '../../lib/m2/t2/compose'
import { validateSlide } from '../../lib/m2/t2/qc'
import { buildSlidePlan } from '../../lib/m2/t2/planner'
import {
  T2_BACKGROUNDS,
} from '../../lib/m2/t2/backgrounds/catalog'
import type { T2Input } from '../../lib/m2/t2/types'

const OUT_DIR = path.join(process.cwd(), 'scripts', 'smoke-t2-fase2', 'output')

async function main() {
  const startedAt = Date.now()
  await fs.mkdir(OUT_DIR, { recursive: true })

  console.log('[smoke-t2-fase2] iniciando…')
  const hasCtaBg = T2_BACKGROUNDS.some((b) => b.id === 'cta-final-bg-01')
  console.log(`[smoke-t2-fase2] cta-final-bg-01 disponível? ${hasCtaBg ? 'SIM' : 'NÃO (usando fallback starfield-04)'}`)

  // T2Input completo: 4 slides (cover + content-6 + comparison + cta-final).
  // Slide cta-final NÃO entra no smoke se cta-final-bg-01 não existe — pulamos
  // o último plan via filter.
  const input: T2Input = {
    modo: 'carrossel',
    templateId: 't2-fase2-smoke',
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
      // Slide 3 — comparison-before-after
      {
        copyTexto:
          'bucha nova muda a sensação da cozinha — trocar a bucha com frequência ajuda a deixar a louça mais limpa e a cozinha mais higiênica',
        slideType: 'comparison',
        slots: {
          title: 'BUCHA NOVA MUDA A SENSAÇÃO DA COZINHA',
          labelBefore: 'ANTES',
          labelAfter: 'DEPOIS',
          caption:
            'Trocar a bucha com frequência ajuda a deixar a louça mais limpa e a cozinha mais higiênica',
        },
      },
      // Slide 4 — cta-final
      {
        copyTexto: 'troque com frequência',
        slideType: 'cta_final',
        slots: {
          title: 'TROQUE COM FREQUÊNCIA',
          subtitle: 'A cada 7 a 15 dias',
          cta: '@charmedodetalhe',
        },
      },
    ],
  }

  // Planner gera os 4 SlidePlans. Pra forçar manualmente background coerente
  // (starfield-01 top → 02 centered → 03 bottom), iteramos previousBgIds
  // como o Planner já faz.
  const plans = buildSlidePlan(input)
  console.log(`[smoke-t2-fase2] planner produziu ${plans.length} slides:`)
  for (const p of plans) {
    console.log(`  · ${p.slideId} type=${p.slideType} subtemplate=${p.subtemplateId} bg=${p.backgroundId}`)
  }

  // Se cta-final-bg-01 não existir, NÃO renderiza o último slide (Rafael ainda
  // não subiu o asset). Smoke roda 3 slides nesse caso.
  const plansToRender = hasCtaBg ? plans : plans.slice(0, -1)
  console.log(`[smoke-t2-fase2] renderizando ${plansToRender.length} slides`)

  const results: Array<{
    slideId: string
    file: string
    bytes: number
    composeMs: number
    qcMs: number
    qc: Awaited<ReturnType<typeof validateSlide>>
  }> = []

  for (const plan of plansToRender) {
    const composeStart = Date.now()
    const buffer = await composeSlide({ plan, imageBuffers: new Map() })
    const composeMs = Date.now() - composeStart

    const qcStart = Date.now()
    const qc = await validateSlide({ buffer, plan })
    const qcMs = Date.now() - qcStart

    const outFile = path.join(OUT_DIR, `smoke-${plan.slideId}.png`)
    await fs.writeFile(outFile, buffer)

    results.push({
      slideId: plan.slideId,
      file: outFile,
      bytes: buffer.length,
      composeMs,
      qcMs,
      qc,
    })

    console.log(
      `[smoke-t2-fase2] ${plan.slideId} OK · ${composeMs}ms compose · ${qcMs}ms qc · ${(buffer.length / 1024).toFixed(0)} KB · qc.pass=${qc.pass} score=${qc.qualityScore} errors=${qc.errors.length} warnings=${qc.warnings.length}`,
    )
    if (qc.errors.length > 0) {
      for (const e of qc.errors) console.log(`    ERROR ${e.code}: ${e.message}`)
    }
    if (qc.warnings.length > 0) {
      for (const w of qc.warnings) console.log(`    WARN  ${w.code}: ${w.message}`)
    }
  }

  // Report consolidado
  const allPass = results.every((r) => r.qc.pass)
  const avgScore = results.reduce((sum, r) => sum + r.qc.qualityScore, 0) / results.length
  const totalMs = Date.now() - startedAt

  await fs.writeFile(
    path.join(OUT_DIR, 'qc-report.json'),
    JSON.stringify(
      {
        ctaFinalBgAvailable: hasCtaBg,
        plansPlanned: plans.length,
        plansRendered: plansToRender.length,
        plans,
        results: results.map((r) => ({
          slideId: r.slideId,
          file: r.file,
          bytes: r.bytes,
          composeMs: r.composeMs,
          qcMs: r.qcMs,
          qc: r.qc,
        })),
        summary: {
          allPass,
          avgScore,
          totalMs,
        },
      },
      null,
      2,
    ),
  )

  console.log('')
  console.log('━'.repeat(60))
  console.log(`✓ Smoke T2 Fase 2 ${allPass ? 'OK' : 'FAIL'} em ${totalMs}ms`)
  console.log(`  Slides renderizados:    ${plansToRender.length} de ${plans.length}`)
  console.log(`  All pass:               ${allPass}`)
  console.log(`  Avg quality score:      ${avgScore.toFixed(1)}`)
  console.log(`  Output dir:             ${OUT_DIR}`)
  console.log(`  Custo:                  $0 (sem IA)`)
  console.log('━'.repeat(60))

  if (!allPass) process.exit(1)
}

main().catch((err) => {
  console.error('[smoke-t2-fase2] FAIL:', err)
  process.exit(1)
})
