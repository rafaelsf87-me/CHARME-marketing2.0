/**
 * Smoke parser Fase 6 — fallback regex sem IA (BUG-M2-003)
 *
 * Cobre só o caminho fallback (sem chamar LLM). Garante que o sistema
 * tem rede de segurança quando o LLM falha.
 *
 * Uso:
 *   pnpm tsx scripts/smoke-t2-fase6-parser/run.ts
 *
 * Custo: $0.
 */

import { parseFallback, parsedSlideSchema } from '../../lib/m2/t2/planner/parse-roteiro'

let passed = 0
let failed = 0

function header(title: string): void {
  console.log('')
  console.log('━'.repeat(60))
  console.log(`  ${title}`)
  console.log('━'.repeat(60))
}

function assertEq(label: string, got: unknown, expected: unknown): void {
  const ok = JSON.stringify(got) === JSON.stringify(expected)
  const sym = ok ? '✓' : '✗'
  console.log(`  ${sym} ${label}`)
  if (!ok) {
    console.log(`      got=${JSON.stringify(got)}`)
    console.log(`      exp=${JSON.stringify(expected)}`)
    failed++
  } else {
    passed++
  }
}

function assert(label: string, cond: boolean, detail?: string): void {
  const sym = cond ? '✓' : '✗'
  console.log(`  ${sym} ${label}`)
  if (!cond) {
    if (detail) console.log(`      ${detail}`)
    failed++
  } else {
    passed++
  }
}

// ─── Bloco A: cover com labels meta ───────────────────────────────────────
header('Bloco A — fallback regex tira labels meta (cover)')

const coverInput = `Texto: Você sabia que a capa elástica veste qualquer sofá?
Apoio: Sim, qualquer um — testamos com 200 modelos.
Descrição da imagem: sofá branco com capa elástica esticada`

const coverParsed = parseFallback({
  slideCopy: coverInput,
  slideType: 'cover',
  slideIndex: 0,
  totalSlides: 4,
})

assertEq(
  'cover.title sem prefixo "Texto:"',
  coverParsed.title,
  'Você sabia que a capa elástica veste qualquer sofá?',
)
assertEq(
  'cover.subtitle sem prefixo "Apoio:"',
  coverParsed.subtitle,
  'Sim, qualquer um — testamos com 200 modelos.',
)
assertEq(
  'cover.imagePrompt extraído de "Descrição da imagem:" (PT-BR cru no fallback)',
  coverParsed.imagePrompt,
  'sofá branco com capa elástica esticada',
)
assertEq('cover.bullets vazio', coverParsed.bullets, [])
assertEq('cover.cta null', coverParsed.cta, null)

// ─── Bloco B: content com bullets ─────────────────────────────────────────
header('Bloco B — fallback regex extrai bullets (content)')

const contentInput = `Texto: 3 itens da cozinha que você troca por R$10
• Bucha amarela com esfregão verde
• Esponja de aço fina
• Pano de microfibra
Descrição da imagem: três itens de limpeza sobre bancada de mármore`

const contentParsed = parseFallback({
  slideCopy: contentInput,
  slideType: 'content',
  slideIndex: 1,
  totalSlides: 4,
})

assertEq(
  'content.title sem prefixo',
  contentParsed.title,
  '3 itens da cozinha que você troca por R$10',
)
assertEq(
  'content.bullets [3 items, sem bullet chars]',
  contentParsed.bullets,
  [
    'Bucha amarela com esfregão verde',
    'Esponja de aço fina',
    'Pano de microfibra',
  ],
)
assertEq(
  'content.imagePrompt extraído',
  contentParsed.imagePrompt,
  'três itens de limpeza sobre bancada de mármore',
)
assertEq('content.subtitle null', contentParsed.subtitle, null)
assertEq('content.cta null', contentParsed.cta, null)

// ─── Bloco C: cta_final extrai CTA ────────────────────────────────────────
header('Bloco C — fallback regex extrai cta (cta_final)')

const ctaInput = `Texto: Aproveite essa promoção agora.
CTA: COMPRAR AGORA`

const ctaParsed = parseFallback({
  slideCopy: ctaInput,
  slideType: 'cta_final',
  slideIndex: 3,
  totalSlides: 4,
})

assertEq('cta_final.title sem prefixo', ctaParsed.title, 'Aproveite essa promoção agora.')
assertEq('cta_final.cta extraído', ctaParsed.cta, 'COMPRAR AGORA')
assertEq('cta_final.imagePrompt null (sem descrição da imagem)', ctaParsed.imagePrompt, null)

// ─── Bloco D: schema Zod valida output ────────────────────────────────────
header('Bloco D — Zod schema aceita output do fallback')

const validation = parsedSlideSchema.safeParse(coverParsed)
assert('cover parseado passa pelo schema Zod', validation.success)

const contentValidation = parsedSlideSchema.safeParse(contentParsed)
assert('content parseado passa pelo schema Zod', contentValidation.success)

const ctaValidation = parsedSlideSchema.safeParse(ctaParsed)
assert('cta_final parseado passa pelo schema Zod', ctaValidation.success)

// ─── Bloco E: input bruto sem labels (texto livre) ─────────────────────────
header('Bloco E — fallback funciona com texto livre (sem labels)')

const livre = parseFallback({
  slideCopy: 'Você sabia disso?\nA gente testou 200 vezes.',
  slideType: 'cover',
  slideIndex: 0,
  totalSlides: 2,
})
assertEq('cover livre.title = linha 1', livre.title, 'Você sabia disso?')
assertEq('cover livre.subtitle = linha 2', livre.subtitle, 'A gente testou 200 vezes.')

// ─── Resultado ─────────────────────────────────────────────────────────────
header('Resultado')
console.log(`  passou: ${passed}`)
console.log(`  falhou: ${failed}`)
if (failed > 0) process.exit(1)
