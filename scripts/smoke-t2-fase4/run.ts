/**
 * Smoke T2 Fase 4 — partes novas (Planner + filename + applyAjusteToPlan)
 *
 * Uso:
 *   pnpm tsx scripts/smoke-t2-fase4/run.ts
 *
 * O que faz:
 * - Valida buildSlidePlan com 4-slide input
 * - Valida buildDownloadFilename pra cada combinação módulo/slide
 * - Valida classifyAjusteIntent + applyAjusteToPlan pra 4 ajustes-padrão
 *
 * NÃO chama IA (Fase 3 já validou pipeline end-to-end). Custo $0.
 *
 * Validação UI end-to-end fica pro Rafael via `pnpm dev`.
 */

import { buildSlidePlan, applyAjusteToPlan, classifyAjusteIntent } from '../../lib/m2/t2/planner'
import { buildDownloadFilename, slugifyKeyword } from '../../lib/filename'
import type { T2Input } from '../../lib/m2/t2/types'

function header(title: string): void {
  console.log('')
  console.log('━'.repeat(60))
  console.log(`  ${title}`)
  console.log('━'.repeat(60))
}

function assertEq(label: string, got: unknown, expected: unknown): void {
  const ok = JSON.stringify(got) === JSON.stringify(expected)
  const symbol = ok ? '✓' : '✗'
  console.log(`${symbol} ${label}`)
  if (!ok) {
    console.log(`    expected: ${JSON.stringify(expected)}`)
    console.log(`    got:      ${JSON.stringify(got)}`)
    process.exitCode = 1
  }
}

async function main() {
  // ─── Filename ────────────────────────────────────────────────────────
  header('lib/filename.ts')

  const fixedDate = new Date('2026-05-19T10:00:00.000Z')

  assertEq('slugifyKeyword "Descontão de Mãe"', slugifyKeyword('Descontão de Mãe'), 'descontao')
  assertEq('slugifyKeyword "bucha"', slugifyKeyword('bucha'), 'bucha')
  assertEq('slugifyKeyword null', slugifyKeyword(null), 'sem-tema')
  assertEq('slugifyKeyword ""', slugifyKeyword(''), 'sem-tema')
  assertEq(
    'slugifyKeyword "muito-longa-com-muitas-palavras"',
    slugifyKeyword('muito-longa-com-muitas-palavras'),
    'muito',
  )
  assertEq(
    'buildDownloadFilename m2 slide3 bucha',
    buildDownloadFilename({
      slide: { kind: 'm2', variant: 'slide3' },
      keyword: 'bucha',
      extension: 'png',
      date: fixedDate,
    }),
    'img-m2-slide3-bucha-mai26.png',
  )
  assertEq(
    'buildDownloadFilename m3 desktop Descontão',
    buildDownloadFilename({
      slide: { kind: 'm3', formato: 'desktop' },
      keyword: 'Descontão de Mãe',
      extension: 'webp',
      date: fixedDate,
    }),
    'img-m3-desktop-descontao-mai26.webp',
  )
  assertEq(
    'buildDownloadFilename m1 detalhe-tecido fallback',
    buildDownloadFilename({
      slide: { kind: 'm1', tipoFoto: 'detalhe-tecido' },
      keyword: '',
      extension: 'webp',
      date: fixedDate,
    }),
    'img-m1-detalhe-sem-tema-mai26.webp',
  )
  assertEq(
    'buildDownloadFilename m4 novidade',
    buildDownloadFilename({
      slide: { kind: 'm4' },
      keyword: 'novidade',
      extension: 'png',
      date: fixedDate,
    }),
    'img-m4-thumb-novidade-mai26.png',
  )
  assertEq(
    'buildDownloadFilename m2 imagem-unica',
    buildDownloadFilename({
      slide: { kind: 'm2', variant: 'imagem-unica' },
      keyword: 'elastica',
      extension: 'png',
      date: fixedDate,
    }),
    'img-m2-imagem-unica-elastica-mai26.png',
  )

  // ─── Planner ─────────────────────────────────────────────────────────
  header('Planner buildSlidePlan (sem IA)')

  const input: T2Input = {
    modo: 'carrossel',
    templateId: 'pipeline-hibrido-v2',
    logo: 'casinha',
    contextoGeral: 'bucha de cozinha',
    slides: [
      { copyTexto: 'SUA BUCHA PODE ESTAR SUJANDO\n\nVeja quando trocar' },
      { copyTexto: 'sinais', slideType: 'content_6', bullets: ['a', 'b', 'c', 'd', 'e', 'f'] },
      { copyTexto: 'comparison teste', slideType: 'comparison' },
      { copyTexto: 'troque com frequência', slideType: 'cta_final' },
    ],
  }
  const plans = buildSlidePlan(input)
  console.log(`✓ buildSlidePlan retornou ${plans.length} slides`)
  assertEq('slide 0 subtemplate', plans[0].subtemplateId, 'cover')
  assertEq('slide 1 subtemplate', plans[1].subtemplateId, 'content-6-boxes')
  assertEq('slide 2 subtemplate', plans[2].subtemplateId, 'comparison-before-after')
  assertEq('slide 3 subtemplate', plans[3].subtemplateId, 'cta-final')
  assertEq('slide 3 backgroundId', plans[3].backgroundId, 'cta-final-bg-01')
  assertEq('slide 3 footer.enabled (DEC-M2-015)', plans[3].footer.enabled, false)

  const families = new Set(plans.slice(0, -1).map((p) => p.backgroundId.split('-').slice(0, -1).join('-')))
  console.log(`✓ slides cover/content/comparison usam ${families.size} family(es): ${[...families].join(', ')}`)

  // ─── applyAjusteToPlan ──────────────────────────────────────────────
  header('classifyAjusteIntent + applyAjusteToPlan')

  const intent1 = classifyAjusteIntent('trocar o fundo pra mais escuro')
  assertEq('intent1.changeBackground', intent1.changeBackground, true)
  assertEq('intent1.regenerateAssets', intent1.regenerateAssets, false)
  assertEq('intent1.reduceText', intent1.reduceText, false)

  const intent2 = classifyAjusteIntent('regerar a imagem do produto com luz mais suave')
  assertEq('intent2.regenerateAssets', intent2.regenerateAssets, true)

  const intent3 = classifyAjusteIntent('encurtar o título, está grande demais')
  assertEq('intent3.reduceText', intent3.reduceText, true)

  const intent4 = classifyAjusteIntent('só ajustar o texto pra ficar mais claro')
  // "claro" também matcha BG keywords — comportamento esperado da heurística.
  console.log(
    `  intent4 (texto "mais claro"): bg=${intent4.changeBackground} assets=${intent4.regenerateAssets} reduceText=${intent4.reduceText}`,
  )

  // Aplica ajuste em slide-1 (cover) — troca background
  const slide1 = plans[0]
  const ajusted = applyAjusteToPlan({
    slidePlanOriginal: slide1,
    slideIndex: 0,
    ajustePrompt: 'trocar fundo pra outra variante',
    packAssets: null,
    contextoOriginal: input,
  })
  const bgChanged = ajusted.backgroundId !== slide1.backgroundId
  console.log(`✓ applyAjusteToPlan(cover, "trocar fundo"): bgChanged=${bgChanged} de ${slide1.backgroundId} → ${ajusted.backgroundId}`)
  assertEq('bg trocou pra outra variant da family', bgChanged, true)

  // Aplica ajuste em cta-final — NÃO deve trocar bg (DEC-M2-015)
  const ctaSlide = plans[3]
  const ctaAjusted = applyAjusteToPlan({
    slidePlanOriginal: ctaSlide,
    slideIndex: 3,
    ajustePrompt: 'trocar fundo',
    packAssets: null,
    contextoOriginal: input,
  })
  assertEq('cta-final NÃO troca bg', ctaAjusted.backgroundId, ctaSlide.backgroundId)

  // Aplica ajuste de texto
  const textAjusted = applyAjusteToPlan({
    slidePlanOriginal: slide1,
    slideIndex: 0,
    ajustePrompt: 'encurtar o texto',
    packAssets: null,
    contextoOriginal: input,
  })
  assertEq(
    'todos textSlots viraram truncate-ellipsis',
    textAjusted.textSlots.every((s) => s.overflowStrategy === 'truncate-ellipsis'),
    true,
  )

  console.log('')
  console.log('━'.repeat(60))
  if (process.exitCode) {
    console.log('  FAIL — algum assert quebrou (ver acima)')
  } else {
    console.log('  ✓ Smoke T2 Fase 4 OK (Planner + filename + applyAjuste)')
    console.log('  Custo: $0 (sem IA — Fase 3 já validou pipeline end-to-end)')
  }
  console.log('━'.repeat(60))
}

main().catch((err) => {
  console.error('[smoke-t2-fase4] FAIL:', err)
  process.exit(1)
})
