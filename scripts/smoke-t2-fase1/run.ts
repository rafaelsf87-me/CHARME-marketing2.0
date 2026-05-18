/**
 * Smoke T2 Fase 1 — pipeline mínimo sem IA
 *
 * Uso:
 *   pnpm tsx scripts/smoke-t2-fase1/run.ts
 *
 * O que faz:
 * - Carrega catalog.ts (não usa Planner — Planner é Fase 2)
 * - Escolhe background starfield-01 manualmente
 * - Constrói SlidePlan inline pro subtemplate cover
 * - Pipeline completo: catalog → fitTextToBox → cover.tsx Satori →
 *   compose Sharp + footer → qc.validateSlide
 * - Salva output PNG + QC report JSON
 *
 * Sem IA, $0 de custo.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { composeSlide } from '../../lib/m2/t2/compose'
import { validateSlide } from '../../lib/m2/t2/qc'
import { getBackground } from '../../lib/m2/t2/backgrounds/catalog'
import type { SlidePlan } from '../../lib/m2/t2/types'

const OUT_DIR = path.join(process.cwd(), 'scripts', 'smoke-t2-fase1', 'output')

async function main() {
  const startedAt = Date.now()

  await fs.mkdir(OUT_DIR, { recursive: true })

  console.log('[smoke-t2-fase1] iniciando…')

  // 1. Confirma background no catálogo
  const bg = getBackground('starfield-01')
  console.log(`[smoke-t2-fase1] bg=${bg.id} family=${bg.family} position=${bg.position}`)

  // 2. SlidePlan inline (Planner é Fase 2)
  const plan: SlidePlan = {
    slideId: 'smoke-cover-1',
    slideIndex: 0,
    slideType: 'cover',
    backgroundId: bg.id,
    subtemplateId: 'cover',
    textSlots: [
      {
        id: 'title',
        content: 'SUA BUCHA PODE ESTAR SUJANDO MAIS',
        slotRef: { kind: 'subtemplate-slot', id: 'title' },
        alignment: 'center',
        overflowStrategy: 'shrink',
      },
      {
        id: 'subtitle',
        content: 'Veja quando trocar a esponja de lavar louça',
        slotRef: { kind: 'subtemplate-slot', id: 'subtitle' },
        alignment: 'center',
        overflowStrategy: 'shrink',
      },
    ],
    imageSlots: [],
    footer: {
      enabled: true,
      logo: 'casinha',
      position: 'bottom-center',
    },
  }

  // 3. Compose (Sharp + Satori, $0)
  console.log('[smoke-t2-fase1] composeSlide…')
  const composeStart = Date.now()
  const buffer = await composeSlide({ plan, imageBuffers: new Map() })
  const composeMs = Date.now() - composeStart
  console.log(`[smoke-t2-fase1] compose OK em ${composeMs}ms · ${buffer.length} bytes`)

  // 4. QC
  console.log('[smoke-t2-fase1] validateSlide…')
  const qcStart = Date.now()
  const qc = await validateSlide({ buffer, plan })
  const qcMs = Date.now() - qcStart
  console.log(
    `[smoke-t2-fase1] qc OK em ${qcMs}ms · pass=${qc.pass} score=${qc.qualityScore} errors=${qc.errors.length} warnings=${qc.warnings.length}`,
  )

  // 5. Salva outputs
  const outPng = path.join(OUT_DIR, 'smoke-cover.png')
  const outJson = path.join(OUT_DIR, 'qc-report.json')
  await fs.writeFile(outPng, buffer)
  await fs.writeFile(
    outJson,
    JSON.stringify(
      {
        plan,
        qc,
        timings: {
          composeMs,
          qcMs,
          totalMs: Date.now() - startedAt,
        },
        output: {
          path: outPng,
          bytes: buffer.length,
        },
      },
      null,
      2,
    ),
  )

  const totalMs = Date.now() - startedAt
  console.log('')
  console.log('━'.repeat(60))
  console.log(`✓ Smoke T2 Fase 1 OK em ${totalMs}ms`)
  console.log(`  PNG:        ${outPng}`)
  console.log(`  Report:     ${outJson}`)
  console.log(`  Size:       ${(buffer.length / 1024).toFixed(1)} KB`)
  console.log(`  QC pass:    ${qc.pass}`)
  console.log(`  QC score:   ${qc.qualityScore}`)
  console.log(`  QC errors:  ${qc.errors.length}`)
  console.log(`  QC warns:   ${qc.warnings.length}`)
  console.log(`  Custo:      $0 (sem IA)`)
  console.log('━'.repeat(60))

  if (!qc.pass) {
    console.error('[smoke-t2-fase1] QC failed, errors:')
    for (const e of qc.errors) {
      console.error(`  ${e.code}: ${e.message}`)
    }
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[smoke-t2-fase1] FAIL:', err)
  process.exit(1)
})
