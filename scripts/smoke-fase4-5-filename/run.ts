/**
 * Smoke Fase 4.5 — retrofit padrão de nome de arquivo (M1, M2 T1, M3, M4)
 *
 * Uso:
 *   pnpm tsx scripts/smoke-fase4-5-filename/run.ts
 *
 * O que faz:
 * - 4 testes: buildDownloadFilename gera o padrão correto pra cada módulo
 *   (M1 / M2 T1 / M3 / M4)
 * - 4 testes: fallback funciona quando keyword vazio em cada módulo
 *
 * Não chama IA, não toca em prod. Custo $0.
 */

import { buildDownloadFilename } from '../../lib/filename'
import { m1KeywordFallbackSource } from '../../lib/m1/schema'

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
  const symbol = ok ? '✓' : '✗'
  console.log(`  ${symbol} ${label}`)
  if (!ok) {
    console.log(`      got=${JSON.stringify(got)}`)
    console.log(`      exp=${JSON.stringify(expected)}`)
    failed++
  } else {
    passed++
  }
}

// Data fixa pra estabilizar mês/ano nos testes: maio/2026 → "mai26".
const REF_DATE = new Date('2026-05-15T12:00:00.000Z')

header('Bloco A — padrão correto por módulo (keyword preenchido)')

assertEq(
  'M1 capa lisa azul',
  buildDownloadFilename({
    slide: { kind: 'm1', tipoFoto: 'capa' },
    keyword: 'floral',
    extension: 'webp',
    date: REF_DATE,
  }),
  'img-m1-capa-floral-mai26.webp',
)

assertEq(
  'M2 T1 carrossel slide 3',
  buildDownloadFilename({
    slide: { kind: 'm2', variant: 'slide3' },
    keyword: 'bucha',
    extension: 'png',
    date: REF_DATE,
  }),
  'img-m2-slide3-bucha-mai26.png',
)

assertEq(
  'M3 banner desktop',
  buildDownloadFilename({
    slide: { kind: 'm3', formato: 'desktop' },
    keyword: 'descontao',
    extension: 'webp',
    date: REF_DATE,
  }),
  'img-m3-desktop-descontao-mai26.webp',
)

assertEq(
  'M4 thumbnail',
  buildDownloadFilename({
    slide: { kind: 'm4' },
    keyword: 'novidade',
    extension: 'png',
    date: REF_DATE,
  }),
  'img-m4-thumb-novidade-mai26.png',
)

header('Bloco B — fallback funciona com keyword vazio por módulo')

// Reproduz exatamente o fluxo do server: o "source" do fallback é montado por
// cada módulo (helpers ou inline) e depois passado direto pra buildDownloadFilename,
// que internamente chama slugifyKeyword uma vez.

assertEq(
  'M1 fallback Lisa: source "cor-ff5733" → "cor"',
  buildDownloadFilename({
    slide: { kind: 'm1', tipoFoto: 'capa' },
    keyword: m1KeywordFallbackSource({ tipoCapa: 'lisa', corHex: '#ff5733', fotoSofa: null }),
    extension: 'webp',
    date: REF_DATE,
  }),
  'img-m1-capa-cor-mai26.webp',
)

assertEq(
  'M2 T1 fallback vazio → "sem-tema" (KEYWORD_FALLBACK)',
  buildDownloadFilename({
    slide: { kind: 'm2', variant: 'imagem-unica' },
    keyword: null,
    extension: 'png',
    date: REF_DATE,
  }),
  'img-m2-imagem-unica-sem-tema-mai26.png',
)

assertEq(
  'M3 fallback nomePromocao "Dia das Mães" → "dia"',
  buildDownloadFilename({
    slide: { kind: 'm3', formato: 'mobile' },
    keyword: 'Dia das Mães',
    extension: 'webp',
    date: REF_DATE,
  }),
  'img-m3-mobile-dia-mai26.webp',
)

assertEq(
  'M4 fallback line1 "Promoção do Mês!" → "promocao"',
  buildDownloadFilename({
    slide: { kind: 'm4' },
    keyword: 'Promoção do Mês!',
    extension: 'png',
    date: REF_DATE,
  }),
  'img-m4-thumb-promocao-mai26.png',
)

header('Resultado')
console.log(`  passou: ${passed}`)
console.log(`  falhou: ${failed}`)

if (failed > 0) {
  process.exit(1)
}
