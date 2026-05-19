/**
 * Smoke hotfix keyword (19/05/2026)
 *
 * Cobre `autoExtractKeyword` (lib/filename.ts) + filename gerado via
 * `buildDownloadFilename({ ..., keywordPreNormalized: true })`.
 *
 * Sem custo IA, sem rede.
 */

import { autoExtractKeyword, buildDownloadFilename } from '../../lib/filename'

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

const REF_DATE = new Date('2026-05-19T12:00:00.000Z')

header('Bloco A — autoExtractKeyword retorna corretamente por módulo')

assertEq(
  'M1 lisa #FF5733 → "cor-ff5733" (com hífen preservado)',
  autoExtractKeyword({ kind: 'm1', tipoCapa: 'lisa', corHex: '#FF5733' }),
  'cor-ff5733',
)

assertEq(
  'M1 estampada + fotoSofa blob URL "...12345-floral-azul.png" → "floral"',
  autoExtractKeyword({
    kind: 'm1',
    tipoCapa: 'estampada',
    fotoEstampaUrl: 'https://abc.public.blob.vercel-storage.com/m1/12345-floral-azul.png',
  }),
  'floral',
)

assertEq(
  'M2 carrossel contexto="Bucha de cozinha" → "bucha"',
  autoExtractKeyword({
    kind: 'm2',
    modo: 'carrossel',
    contextoGeral: 'Bucha de cozinha',
    firstSlideCopyTexto: 'Slide 1 texto aleatório',
  }),
  'bucha',
)

assertEq(
  'M3 nomePromocao="Descontão de Maio" → "descontao"',
  autoExtractKeyword({ kind: 'm3', nomePromocao: 'Descontão de Maio' }),
  'descontao',
)

assertEq(
  'M4 line1="Promoção do Mês" → "promocao"',
  autoExtractKeyword({ kind: 'm4', line1: 'Promoção do Mês' }),
  'promocao',
)

header('Bloco B — fallback quando inputs vazios/null')

assertEq(
  'M1 fallback global → "foto" (sem cor, sem fotoSofa)',
  autoExtractKeyword({ kind: 'm1', tipoCapa: 'estampada' }),
  'foto',
)

assertEq(
  'M1 fotoSofa sem nome útil (só dígitos) → "estampa"',
  autoExtractKeyword({
    kind: 'm1',
    tipoCapa: 'alto-relevo',
    fotoEstampaUrl: 'https://abc.public.blob.vercel-storage.com/m1/1234567890.png',
  }),
  'estampa',
)

assertEq(
  'M2 carrossel sem contexto nem slide → "carrossel"',
  autoExtractKeyword({ kind: 'm2', modo: 'carrossel' }),
  'carrossel',
)

assertEq(
  'M2 imagem-única sem nada → "post"',
  autoExtractKeyword({ kind: 'm2', modo: 'imagem-unica' }),
  'post',
)

assertEq(
  'M3 sem nomePromocao → "banner"',
  autoExtractKeyword({ kind: 'm3' }),
  'banner',
)

assertEq(
  'M4 sem line1 → "thumb"',
  autoExtractKeyword({ kind: 'm4' }),
  'thumb',
)

header('Bloco C — buildDownloadFilename com keywordPreNormalized preserva formato')

assertEq(
  'M1 capa lisa: filename preserva "cor-ff5733" sem cortar no hífen',
  buildDownloadFilename({
    slide: { kind: 'm1', tipoFoto: 'capa' },
    keyword: autoExtractKeyword({ kind: 'm1', tipoCapa: 'lisa', corHex: '#FF5733' }),
    keywordPreNormalized: true,
    extension: 'webp',
    date: REF_DATE,
  }),
  'img-m1-capa-cor-ff5733-mai26.webp',
)

assertEq(
  'M2 slide3 com keyword pre-normalizada "bucha"',
  buildDownloadFilename({
    slide: { kind: 'm2', variant: 'slide3' },
    keyword: 'bucha',
    keywordPreNormalized: true,
    extension: 'png',
    date: REF_DATE,
  }),
  'img-m2-slide3-bucha-mai26.png',
)

assertEq(
  'M4 thumb fallback (sem keyword) → usa "sem-tema"',
  buildDownloadFilename({
    slide: { kind: 'm4' },
    keyword: null,
    keywordPreNormalized: true,
    extension: 'png',
    date: REF_DATE,
  }),
  'img-m4-thumb-sem-tema-mai26.png',
)

header('Resultado')
console.log(`  passou: ${passed}`)
console.log(`  falhou: ${failed}`)
if (failed > 0) process.exit(1)
