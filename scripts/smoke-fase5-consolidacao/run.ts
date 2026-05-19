/**
 * Smoke Fase 5 — Consolidação T2 (registry + modoGeracao)
 *
 * Uso:
 *   pnpm tsx scripts/smoke-fase5-consolidacao/run.ts
 *
 * Cobre:
 *  1. listTemplates() retorna exatamente 2 cards: Template 1 (ativo) + Em breve (em-breve).
 *  2. getTemplate('pipeline-hibrido-v2') retorna template com nome "Template 1".
 *  3. chooseBackgroundForCarousel ainda retorna BG válido (T1 não afetou catálogo T2).
 *  4. m2-form.tsx default = 'pipeline-hibrido-v2' (lê source).
 *  5. t2InputSchema aceita modoGeracao 'ia' e 'upload'; default 'ia' quando omitido.
 *  6. buildSlidePlan com modoGeracao='upload' + comparison + imageMainUploadUrl
 *     cria slot source='uploaded'.
 *  7. buildSlidePlan com modoGeracao='ia' + comparison + imageMainUploadUrl
 *     IGNORA o upload e cai em ai_generated (se prompt) ou static-asset.
 *
 * Sem custo IA, sem rede.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { listTemplates, getTemplate } from '../../lib/m2/templates'
import { chooseBackgroundForCarousel } from '../../lib/m2/t2/backgrounds/select'
import { t2InputSchema } from '../../lib/m2/t2/schema'
import { buildSlidePlan } from '../../lib/m2/t2/planner'
import type { T2Input } from '../../lib/m2/t2/types'

let passed = 0
let failed = 0

function header(title: string): void {
  console.log('')
  console.log('━'.repeat(60))
  console.log(`  ${title}`)
  console.log('━'.repeat(60))
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

// 1+2: Registry
header('Bloco A — Registry')

const tpls = listTemplates()
assert(
  '[1] listTemplates retorna exatamente 2 cards',
  tpls.length === 2,
  `got ${tpls.length}: ${tpls.map((t) => t.id).join(', ')}`,
)
assert(
  '[1] primeiro card = Template 1 (ativo)',
  tpls[0]?.id === 'pipeline-hibrido-v2' &&
    tpls[0]?.nome === 'Template 1' &&
    tpls[0]?.status === 'ativo',
  `got id=${tpls[0]?.id}, nome="${tpls[0]?.nome}", status=${tpls[0]?.status}`,
)
assert(
  '[1] segundo card = Em breve (em-breve)',
  tpls[1]?.id === 'em-breve-1' &&
    tpls[1]?.nome === 'Em breve' &&
    tpls[1]?.status === 'em-breve',
  `got id=${tpls[1]?.id}, nome="${tpls[1]?.nome}", status=${tpls[1]?.status}`,
)

const t2 = getTemplate('pipeline-hibrido-v2')
assert(
  '[2] getTemplate(pipeline-hibrido-v2).nome === "Template 1"',
  t2?.nome === 'Template 1',
  `got "${t2?.nome}"`,
)

// 3: Backgrounds (catálogo T2 inalterado)
header('Bloco B — Backgrounds')

const bg0 = chooseBackgroundForCarousel(0, [])
assert(
  '[3] chooseBackgroundForCarousel(0, []) retorna BG válido',
  !!bg0?.id && !!bg0?.file,
  `got id=${bg0?.id}, file=${bg0?.file}`,
)
const bg1 = chooseBackgroundForCarousel(1, [bg0.id])
assert(
  '[3] chooseBackgroundForCarousel(1, [bg0]) escolhe variant diferente',
  bg1.id !== bg0.id,
  `got bg0=${bg0.id}, bg1=${bg1.id}`,
)
assert('[3] família é mesma (I7)', bg0.family === bg1.family)

// 4: Default em m2-form.tsx
header('Bloco C — Default UI')

const m2FormSrc = readFileSync(
  path.join(process.cwd(), 'app/imagens/m2-posts/_components/m2-form.tsx'),
  'utf-8',
)
assert(
  '[4] m2-form.tsx usa useState("pipeline-hibrido-v2") como default',
  /useState<M2TemplateId>\('pipeline-hibrido-v2'\)/.test(m2FormSrc),
  'pattern não encontrado',
)

// 5: Schema modoGeracao
header('Bloco D — Schema modoGeracao')

const baseSlide = { copyTexto: 'Texto de exemplo do slide 1 com conteúdo' }
const baseCover = { copyTexto: 'Capa do carrossel\n\nSubtítulo opcional' }
const baseCta = { copyTexto: 'Última call to action do carrossel' }

const parsedDefault = t2InputSchema.parse({
  modo: 'carrossel',
  templateId: 'pipeline-hibrido-v2',
  logo: 'casinha',
  slides: [baseCover, baseSlide, baseCta],
})
assert(
  '[5] default modoGeracao quando omitido = "ia"',
  parsedDefault.modoGeracao === 'ia',
  `got ${parsedDefault.modoGeracao}`,
)

const parsedUpload = t2InputSchema.parse({
  modo: 'carrossel',
  templateId: 'pipeline-hibrido-v2',
  logo: 'casinha',
  slides: [baseCover, baseSlide, baseCta],
  modoGeracao: 'upload',
})
assert(
  '[5] aceita modoGeracao = "upload"',
  parsedUpload.modoGeracao === 'upload',
)

let invalidThrew = false
try {
  t2InputSchema.parse({
    modo: 'carrossel',
    templateId: 'pipeline-hibrido-v2',
    logo: 'casinha',
    slides: [baseCover, baseSlide, baseCta],
    modoGeracao: 'invalido',
  })
} catch {
  invalidThrew = true
}
assert('[5] rejeita modoGeracao inválido', invalidThrew)

// 6+7: Planner respeita modoGeracao em comparison
header('Bloco E — Planner respeita modoGeracao em comparison')

const planUpload: T2Input = {
  modo: 'carrossel',
  templateId: 'pipeline-hibrido-v2',
  logo: 'casinha',
  slides: [
    baseCover,
    {
      copyTexto: 'Antes e depois — antes ficava sujo, depois ficou limpo',
      slideType: 'comparison',
      imageMainUploadUrl: 'https://example.com/upload-product.png',
    },
    baseCta,
  ],
  modoGeracao: 'upload',
}
const plansUpload = buildSlidePlan(planUpload)
const compSlideUpload = plansUpload[1]
const beforeSlot = compSlideUpload.imageSlots.find((s) => s.id === 'image-before')
assert(
  '[6] modoGeracao=upload + comparison + url → source="uploaded"',
  beforeSlot?.source === 'uploaded' &&
    beforeSlot?.uploadedUrl === 'https://example.com/upload-product.png',
  `got source=${beforeSlot?.source}`,
)

const planIaIgnoraUpload: T2Input = {
  ...planUpload,
  modoGeracao: 'ia',
}
const plansIa = buildSlidePlan(planIaIgnoraUpload)
const beforeSlotIa = plansIa[1].imageSlots.find((s) => s.id === 'image-before')
assert(
  '[7] modoGeracao=ia + comparison + url → IGNORA upload (static-asset fallback)',
  beforeSlotIa?.source === 'static-asset',
  `got source=${beforeSlotIa?.source}`,
)

// Resultado
header('Resultado')
console.log(`  passou: ${passed}`)
console.log(`  falhou: ${failed}`)
if (failed > 0) process.exit(1)
