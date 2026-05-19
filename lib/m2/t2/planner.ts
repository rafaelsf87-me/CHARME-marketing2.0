/**
 * T2 Planner — input do user → SlidePlan[]
 *
 * Fase 2:
 * - Carrossel ≥2 slides: slide 0 = cover, último = cta-final (obrigatório
 *   por DEC-M2-015), meio = content por heurística (3/6 boxes) ou comparison.
 * - Imagem única: 1 slide tipo imagem_unica usando subtemplate cta-final
 *   (compartilha background com footer embutido).
 * - Background dos cover/content/comparison: chooseBackgroundForCarousel
 *   (mesma family — I7). cta-final/imagem_unica: SEMPRE cta-final-bg-01.
 *
 * Slide.slideType e Slide.subtemplateId podem ser forçados via T2SlideInput.
 *
 * Validação: cada SlidePlan passa por slidePlanSchema antes de ser retornado.
 */

import type {
  ImageSlot,
  RegerarSlideInput,
  SlidePlan,
  SlidePlanFooter,
  T2Input,
  T2ModoGeracao,
  T2SlideInput,
  T2SlideType,
  T2SubtemplateId,
} from './types'
import { chooseBackgroundForCarousel } from './backgrounds/select'
import { T2_BACKGROUNDS } from './backgrounds/catalog'
import { slidePlanSchema } from './schema'
import {
  parseRoteiroSlide,
  type ParsedSlide,
  type ParseRoteiroResult,
  type ParsedSlideSlideType,
} from './planner/parse-roteiro'

// ID do background dedicado pro cta-final (DEC-M2-015).
// Curado manualmente, footer já embutido no PNG.
export const T2_CTA_FINAL_BG_ID = 'cta-final-bg-01'

// Fallback enquanto Rafael não subiu cta-final-bg-01.png — usa
// um starfield centered. Permite build verde + smoke parcial.
// Quando o asset existir, basta adicionar entry no catalog.ts.
export const T2_CTA_FINAL_BG_FALLBACK_ID = 'starfield-04'

// ─── Helpers ────────────────────────────────────────────────────────────────

function countBullets(input: T2SlideInput): number {
  if (input.bullets?.length) return input.bullets.length
  // Heurística simples: linhas separadas por \n ou bullets `•`/`-`/`*`.
  const lines = input.copyTexto
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  return lines.length
}

function hasComparisonHints(input: T2SlideInput): boolean {
  if (input.slideType === 'comparison') return true
  if (input.slots?.labelBefore && input.slots?.labelAfter) return true
  const text = input.copyTexto.toLowerCase()
  return /\bantes\b.*\bdepois\b/i.test(text)
}

function inferSlideType(input: T2SlideInput, isFirst: boolean, isLast: boolean): T2SlideType {
  if (input.slideType) return input.slideType
  if (isLast) return 'cta_final'
  if (isFirst) return 'cover'
  if (hasComparisonHints(input)) return 'comparison'
  return 'content_3'
}

function inferSubtemplate(
  input: T2SlideInput,
  slideType: T2SlideType,
): T2SubtemplateId {
  if (input.subtemplateId) return input.subtemplateId
  switch (slideType) {
    case 'cover':
      return 'cover'
    case 'cta_final':
    case 'imagem_unica':
      return 'cta-final'
    case 'comparison':
      return 'comparison-before-after'
    case 'content_6':
      return 'content-6-boxes'
    case 'content_3':
    default: {
      const n = countBullets(input)
      if (n >= 4) return 'content-6-boxes'
      return 'content-3-boxes'
    }
  }
}

function defaultFooter(): SlidePlanFooter {
  // DEC-M2-015: footer programático aposentado em V1. Marker `enabled=false`
  // pra QC saber que não deve checar FOOTER_MISSING.
  return { enabled: false, logo: 'casinha', position: 'bottom-center' }
}

/**
 * Cria imageSlot 'image-main' conforme modo + parsed.imagePrompt. Retorna
 * null se nenhuma fonte de imagem disponível (slide sem imagem).
 *
 * Política BUG-M2-004 Fase 6:
 *   - modoGeracao='upload' + input.imageMainUploadUrl → source='uploaded'
 *     (DEC-M2-014 bypassa LLM e GPT Image; LLM ainda processa textos).
 *   - modoGeracao='ia' + parsed.imagePrompt → source='ai_generated'
 *   - sem nenhum dos dois → null (subtemplate renderiza sem imagem)
 */
function buildImageMainSlot(args: {
  input: T2SlideInput
  parsed: ParsedSlide
  modoGeracao: T2ModoGeracao
}): ImageSlot | null {
  if (args.modoGeracao === 'upload' && args.input.imageMainUploadUrl) {
    return {
      id: 'image-main',
      source: 'uploaded',
      slotRef: { kind: 'subtemplate-slot', id: 'image-main' },
      uploadedUrl: args.input.imageMainUploadUrl,
      treatment: 'rounded',
    }
  }
  if (args.modoGeracao === 'ia' && args.parsed.imagePrompt) {
    return {
      id: 'image-main',
      source: 'ai_generated',
      slotRef: { kind: 'subtemplate-slot', id: 'image-main' },
      ai: { prompt: args.parsed.imagePrompt, assetType: 'product' },
      treatment: 'rounded',
    }
  }
  return null
}

/** Mapeia T2SlideType pra ParsedSlideSlideType (input do LLM parser). */
function toParserSlideType(slideType: T2SlideType): ParsedSlideSlideType {
  switch (slideType) {
    case 'cover':
      return 'cover'
    case 'cta_final':
      return 'cta_final'
    case 'imagem_unica':
      return 'imagem_unica'
    case 'content_3':
    case 'content_6':
      return 'content'
    case 'comparison':
      // Comparison não passa pelo LLM parser (input já estruturado via slots).
      // Caso seja chamado, trata como content (parser não vai usar mesmo).
      return 'content'
  }
}

function parseCoverText(copyTexto: string): { title: string; subtitle: string } {
  // Cover espera title + subtitle separados por \n\n ou primeira linha = título.
  const parts = copyTexto.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return { title: parts[0], subtitle: parts.slice(1).join(' ') }
  }
  // Fallback: primeira linha = title, resto = subtitle.
  const lines = copyTexto.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  return {
    title: lines[0] ?? copyTexto,
    subtitle: lines.slice(1).join(' '),
  }
}

function parseBullets(input: T2SlideInput): string[] {
  if (input.bullets?.length) return input.bullets
  return input.copyTexto
    .split(/\n+/)
    .map((l) => l.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean)
}

// ─── Builders por subtemplate ───────────────────────────────────────────────

function buildCoverPlan(args: {
  index: number
  input: T2SlideInput
  backgroundId: string
  parsed?: ParsedSlide
  modoGeracao?: T2ModoGeracao
}): SlidePlan {
  // Quando parsed presente (LLM ou fallback), usa-o; senão heurística antiga.
  const title = args.parsed?.title || parseCoverText(args.input.copyTexto).title
  const subtitle = args.parsed?.subtitle ?? parseCoverText(args.input.copyTexto).subtitle

  const imageSlot = args.parsed
    ? buildImageMainSlot({
        input: args.input,
        parsed: args.parsed,
        modoGeracao: args.modoGeracao ?? 'ia',
      })
    : null

  return {
    slideId: `slide-${args.index + 1}`,
    slideIndex: args.index,
    slideType: 'cover',
    backgroundId: args.backgroundId,
    subtemplateId: 'cover',
    textSlots: [
      {
        id: 'title',
        content: title,
        slotRef: { kind: 'subtemplate-slot', id: 'title' },
        overflowStrategy: 'shrink',
      },
      {
        id: 'subtitle',
        content: subtitle ?? '',
        slotRef: { kind: 'subtemplate-slot', id: 'subtitle' },
        overflowStrategy: 'shrink',
      },
    ],
    imageSlots: imageSlot ? [imageSlot] : [],
    footer: defaultFooter(),
  }
}

function buildContentPlan(args: {
  index: number
  input: T2SlideInput
  backgroundId: string
  subtemplateId: 'content-3-boxes' | 'content-6-boxes'
  parsed?: ParsedSlide
  modoGeracao?: T2ModoGeracao
}): SlidePlan {
  let title: string
  let boxes: string[]

  if (args.parsed) {
    title = args.parsed.title
    boxes = args.parsed.bullets
  } else {
    // Fallback heurístico (compat sem parser)
    const bullets = parseBullets(args.input)
    title = args.input.slots?.title ?? ''
    boxes = bullets
    if (!title && bullets.length > 0 && bullets[0].length < 60) {
      if (args.input.slots?.title) {
        title = args.input.slots.title
      } else if (bullets.length > (args.subtemplateId === 'content-6-boxes' ? 4 : 2)) {
        title = bullets[0]
        boxes = bullets.slice(1)
      }
    }
  }

  const maxBoxes = args.subtemplateId === 'content-6-boxes' ? 6 : 3
  const boxesLimited = boxes.slice(0, maxBoxes)

  const imageSlot = args.parsed
    ? buildImageMainSlot({
        input: args.input,
        parsed: args.parsed,
        modoGeracao: args.modoGeracao ?? 'ia',
      })
    : null

  return {
    slideId: `slide-${args.index + 1}`,
    slideIndex: args.index,
    slideType: args.subtemplateId === 'content-6-boxes' ? 'content_6' : 'content_3',
    backgroundId: args.backgroundId,
    subtemplateId: args.subtemplateId,
    textSlots: [
      ...(title
        ? [
            {
              id: 'title',
              content: title,
              slotRef: { kind: 'subtemplate-slot' as const, id: 'title' },
              overflowStrategy: 'shrink' as const,
            },
          ]
        : []),
      ...boxesLimited.map((b, i) => ({
        id: `box-${i + 1}`,
        content: b,
        slotRef: { kind: 'subtemplate-slot' as const, id: `box-${i + 1}` },
        overflowStrategy: 'shrink' as const,
      })),
    ],
    imageSlots: imageSlot ? [imageSlot] : [],
    footer: defaultFooter(),
  }
}

function buildComparisonPlan(args: {
  index: number
  input: T2SlideInput
  backgroundId: string
  modoGeracao: 'ia' | 'upload'
}): SlidePlan {
  const slots = args.input.slots ?? {}
  const labelBefore = slots.labelBefore ?? 'ANTES'
  const labelAfter = slots.labelAfter ?? 'DEPOIS'
  const caption = slots.caption ?? ''

  // Title: primeira linha do copyTexto OU slots.title
  const lines = args.input.copyTexto.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const title = slots.title ?? lines[0] ?? ''

  // Em modo IA, ignora upload (volta pra prompt/static-asset). Em modo upload,
  // usa o uploadedUrl como asset pronto (DEC-M2-014).
  const useUpload = args.modoGeracao === 'upload' && !!args.input.imageMainUploadUrl

  return {
    slideId: `slide-${args.index + 1}`,
    slideIndex: args.index,
    slideType: 'comparison',
    backgroundId: args.backgroundId,
    subtemplateId: 'comparison-before-after',
    textSlots: [
      {
        id: 'title',
        content: title,
        slotRef: { kind: 'subtemplate-slot', id: 'title' },
        overflowStrategy: 'shrink',
      },
      {
        id: 'label-before',
        content: labelBefore,
        slotRef: { kind: 'subtemplate-slot', id: 'label-before' },
        overflowStrategy: 'shrink',
      },
      {
        id: 'label-after',
        content: labelAfter,
        slotRef: { kind: 'subtemplate-slot', id: 'label-after' },
        overflowStrategy: 'shrink',
      },
      ...(caption
        ? [
            {
              id: 'caption',
              content: caption,
              slotRef: { kind: 'subtemplate-slot' as const, id: 'caption' },
              overflowStrategy: 'shrink' as const,
            },
          ]
        : []),
    ],
    // imageSlots resolvidos por prioridade (depende de modoGeracao):
    //   modoGeracao='upload' + imageMainUploadUrl → uploaded (image-before)
    //   modoGeracao='ia' OU sem upload:
    //     1. slots.imagePromptBefore/After → ai_generated
    //     2. fallback: placeholders neutros
    imageSlots: [
      useUpload
        ? {
            id: 'image-before',
            source: 'uploaded' as const,
            slotRef: { kind: 'subtemplate-slot' as const, id: 'image-before' },
            uploadedUrl: args.input.imageMainUploadUrl!,
            treatment: 'rounded' as const,
          }
        : slots.imagePromptBefore
          ? {
              id: 'image-before',
              source: 'ai_generated' as const,
              slotRef: { kind: 'subtemplate-slot' as const, id: 'image-before' },
              ai: { prompt: slots.imagePromptBefore, assetType: 'product' as const },
              treatment: 'rounded' as const,
            }
          : {
              id: 'image-before',
              source: 'static-asset' as const,
              slotRef: { kind: 'subtemplate-slot' as const, id: 'image-before' },
              staticPath: '/brand/m2/placeholders/neutral-1.png',
              treatment: 'rounded' as const,
            },
      slots.imagePromptAfter
        ? {
            id: 'image-after',
            source: 'ai_generated' as const,
            slotRef: { kind: 'subtemplate-slot' as const, id: 'image-after' },
            ai: { prompt: slots.imagePromptAfter, assetType: 'product' as const },
            treatment: 'rounded' as const,
          }
        : {
            id: 'image-after',
            source: 'static-asset' as const,
            slotRef: { kind: 'subtemplate-slot' as const, id: 'image-after' },
            staticPath: '/brand/m2/placeholders/neutral-2.png',
            treatment: 'rounded' as const,
          },
    ],
    footer: defaultFooter(),
  }
}

function buildCtaFinalPlan(args: {
  index: number
  input: T2SlideInput
  backgroundId: string
  isSingle: boolean
  parsed?: ParsedSlide
  modoGeracao?: T2ModoGeracao
}): SlidePlan {
  const slots = args.input.slots ?? {}
  const lines = args.input.copyTexto.split(/\n+/).map((l) => l.trim()).filter(Boolean)

  const title = args.parsed?.title || (slots.title ?? lines[0] ?? '')
  const subtitle =
    args.parsed?.subtitle ??
    slots.subtitle ??
    (lines.slice(1, 2).join(' ') || '')
  // DEC-M2-015: footer embutido no background já carrega @handle. CTA agora
  // é call-to-action de ação (ex: "CONHEÇA NA LOJA" ou frase longa).
  // Fase 6 v2: slice 30→220 chars (auto-shrink do text-renderer encaixa).
  const ctaFromParser = args.parsed?.cta ?? null
  const cta = (ctaFromParser ?? slots.cta ?? 'CONHEÇA NA LOJA').slice(0, 220)

  // BUG-M2-004 Fase 6 (conservador): cta-final só ganha image-main se o
  // parser/usuário pediu explicitamente. Sem default decorativo.
  const imageSlot = args.parsed
    ? buildImageMainSlot({
        input: args.input,
        parsed: args.parsed,
        modoGeracao: args.modoGeracao ?? 'ia',
      })
    : null

  return {
    slideId: args.isSingle ? 'imagem-unica' : `slide-${args.index + 1}`,
    slideIndex: args.index,
    slideType: args.isSingle ? 'imagem_unica' : 'cta_final',
    backgroundId: args.backgroundId,
    subtemplateId: 'cta-final',
    textSlots: [
      {
        id: 'title',
        content: title,
        slotRef: { kind: 'subtemplate-slot', id: 'title' },
        overflowStrategy: 'shrink',
      },
      {
        id: 'subtitle',
        content: subtitle,
        slotRef: { kind: 'subtemplate-slot', id: 'subtitle' },
        overflowStrategy: 'shrink',
      },
      {
        id: 'cta',
        content: cta,
        slotRef: { kind: 'subtemplate-slot', id: 'cta' },
        overflowStrategy: 'shrink',
      },
    ],
    imageSlots: imageSlot ? [imageSlot] : [],
    // cta-final tem footer embutido no background — não programático.
    footer: defaultFooter(),
  }
}

// ─── buildSlidePlan ─────────────────────────────────────────────────────────

function resolveCtaBackgroundId(): string {
  // Se cta-final-bg-01 já estiver no catalog, usa. Senão fallback (asset
  // bloqueante DEC-M2-015 — Rafael cria em paralelo).
  const exists = T2_BACKGROUNDS.some((b) => b.id === T2_CTA_FINAL_BG_ID)
  return exists ? T2_CTA_FINAL_BG_ID : T2_CTA_FINAL_BG_FALLBACK_ID
}

/**
 * Constrói SlidePlan[] a partir do input do form.
 *
 * modoGeracao (default 'ia'):
 *   - 'ia'      → planner cria imageSlots ai_generated nos subtemplates que
 *                 suportam imagens (atualmente só comparison-before-after).
 *   - 'upload'  → planner usa `imageMainUploadUrl` como `source='uploaded'`
 *                 em comparison. Em cover, content-3-boxes, content-6-boxes
 *                 e cta-final o campo é silenciosamente ignorado porque esses
 *                 subtemplates NÃO têm slot image-main definido (ver
 *                 [REF-M2-006] em DIVIDAS).
 */
export function buildSlidePlan(input: T2Input): SlidePlan[] {
  const ctaBgId = resolveCtaBackgroundId()
  const modoGeracao = input.modoGeracao ?? 'ia'

  if (input.modo === 'imagem-unica') {
    if (input.slides.length !== 1) {
      throw new Error(`[T2] imagem-unica exige exatamente 1 slide, recebeu ${input.slides.length}`)
    }
    const plan = buildCtaFinalPlan({
      index: 0,
      input: input.slides[0],
      backgroundId: ctaBgId,
      isSingle: true,
    })
    return [slidePlanSchema.parse(plan)]
  }

  // Carrossel
  const n = input.slides.length
  if (n < 2) {
    throw new Error(`[T2] carrossel exige ≥2 slides, recebeu ${n}`)
  }

  const plans: SlidePlan[] = []
  const previousBgIds: string[] = []

  for (let i = 0; i < n; i++) {
    const slide = input.slides[i]
    const isFirst = i === 0
    const isLast = i === n - 1
    const slideType = inferSlideType(slide, isFirst, isLast)
    const subtemplateId = inferSubtemplate(slide, slideType)

    let backgroundId: string
    if (isLast) {
      backgroundId = ctaBgId
    } else {
      const bg = chooseBackgroundForCarousel(i, previousBgIds)
      backgroundId = bg.id
      previousBgIds.push(backgroundId)
    }

    let plan: SlidePlan
    switch (subtemplateId) {
      case 'cover':
        plan = buildCoverPlan({ index: i, input: slide, backgroundId })
        break
      case 'content-3-boxes':
      case 'content-6-boxes':
        plan = buildContentPlan({ index: i, input: slide, backgroundId, subtemplateId })
        break
      case 'comparison-before-after':
        plan = buildComparisonPlan({ index: i, input: slide, backgroundId, modoGeracao })
        break
      case 'cta-final':
        plan = buildCtaFinalPlan({ index: i, input: slide, backgroundId, isSingle: false })
        break
      default:
        throw new Error(`[T2] subtemplate "${subtemplateId}" não suportado pelo Planner`)
    }

    plans.push(slidePlanSchema.parse(plan))
  }

  // Hard check final: último slide DEVE ser cta-final (DEC-M2-015).
  const last = plans[plans.length - 1]
  if (last.subtemplateId !== 'cta-final') {
    throw new Error(
      `[T2] DEC-M2-015 violado: último slide do carrossel deve ser cta-final, foi ${last.subtemplateId}`,
    )
  }

  return plans
}

// ─── buildSlidePlanWithParser (Fase 6 — LLM-based) ─────────────────────────

export interface BuildSlidePlanResult {
  plans: SlidePlan[]
  /** Log do parser por slide pra auditoria/debug. */
  parserResults: ParseRoteiroResult[]
}

/**
 * Versão async de buildSlidePlan que chama o LLM parser (Claude Haiku 4.5
 * via fal-ai/any-llm) em paralelo pra cada slide. Substitui parseCoverText/
 * parseBullets do builder sync por extração semântica estruturada.
 *
 * Cria imageSlot 'image-main' quando parsed.imagePrompt presente (modo IA)
 * ou imageMainUploadUrl presente (modo upload — DEC-M2-014 bypassa LLM e
 * GPT Image, asset pronto via compose Sharp).
 *
 * Slides de tipo 'comparison' NÃO passam pelo parser (input já estruturado
 * via slots.imagePromptBefore/After/labelBefore/labelAfter/caption).
 *
 * Em caso de falha do LLM (timeout/JSON inválido/Zod fail), o parser
 * retorna via='fallback' com extração regex — geração NUNCA bloqueia.
 */
export async function buildSlidePlanWithParser(input: T2Input): Promise<BuildSlidePlanResult> {
  const ctaBgId = resolveCtaBackgroundId()
  const modoGeracao = input.modoGeracao ?? 'ia'

  // ─── Imagem única ────────────────────────────────────────────────────────
  if (input.modo === 'imagem-unica') {
    if (input.slides.length !== 1) {
      throw new Error(`[T2] imagem-unica exige exatamente 1 slide, recebeu ${input.slides.length}`)
    }
    const parserResult = await parseRoteiroSlide({
      slideCopy: input.slides[0].copyTexto,
      slideType: 'imagem_unica',
      slideIndex: 0,
      totalSlides: 1,
    })
    const plan = buildCtaFinalPlan({
      index: 0,
      input: input.slides[0],
      backgroundId: ctaBgId,
      isSingle: true,
      parsed: parserResult.parsed,
      modoGeracao,
    })
    return {
      plans: [slidePlanSchema.parse(plan)],
      parserResults: [parserResult],
    }
  }

  // ─── Carrossel ───────────────────────────────────────────────────────────
  const n = input.slides.length
  if (n < 2) throw new Error(`[T2] carrossel exige ≥2 slides, recebeu ${n}`)

  // Decide slideType + subtemplate por slide ANTES de chamar LLM (heurística
  // determinística — não depende do parser).
  const slideMetas = input.slides.map((slide, i) => {
    const isFirst = i === 0
    const isLast = i === n - 1
    const slideType = inferSlideType(slide, isFirst, isLast)
    const subtemplateId = inferSubtemplate(slide, slideType)
    return { slide, i, slideType, subtemplateId, isLast }
  })

  // Resolve backgrounds (compartilha family — invariante I7).
  const previousBgIds: string[] = []
  const backgroundIds: string[] = []
  for (const meta of slideMetas) {
    if (meta.isLast) {
      backgroundIds.push(ctaBgId)
    } else {
      const bg = chooseBackgroundForCarousel(meta.i, previousBgIds)
      backgroundIds.push(bg.id)
      previousBgIds.push(bg.id)
    }
  }

  // Dispara LLM em paralelo pra slides que precisam (não-comparison).
  const parserPromises = slideMetas.map(async (meta): Promise<ParseRoteiroResult | null> => {
    if (meta.subtemplateId === 'comparison-before-after') {
      return null // input estruturado, não passa pelo parser
    }
    return parseRoteiroSlide({
      slideCopy: meta.slide.copyTexto,
      slideType: toParserSlideType(meta.slideType),
      slideIndex: meta.i,
      totalSlides: n,
    })
  })
  const parserResultsRaw = await Promise.all(parserPromises)

  const plans: SlidePlan[] = []
  for (let i = 0; i < slideMetas.length; i++) {
    const meta = slideMetas[i]
    const parserResult = parserResultsRaw[i]
    const parsed = parserResult?.parsed
    const backgroundId = backgroundIds[i]

    let plan: SlidePlan
    switch (meta.subtemplateId) {
      case 'cover':
        plan = buildCoverPlan({ index: meta.i, input: meta.slide, backgroundId, parsed, modoGeracao })
        break
      case 'content-3-boxes':
      case 'content-6-boxes':
        plan = buildContentPlan({
          index: meta.i,
          input: meta.slide,
          backgroundId,
          subtemplateId: meta.subtemplateId,
          parsed,
          modoGeracao,
        })
        break
      case 'comparison-before-after':
        plan = buildComparisonPlan({ index: meta.i, input: meta.slide, backgroundId, modoGeracao })
        break
      case 'cta-final':
        plan = buildCtaFinalPlan({
          index: meta.i,
          input: meta.slide,
          backgroundId,
          isSingle: false,
          parsed,
          modoGeracao,
        })
        break
      default:
        throw new Error(`[T2] subtemplate "${meta.subtemplateId}" não suportado pelo Planner`)
    }
    plans.push(slidePlanSchema.parse(plan))
  }

  const last = plans[plans.length - 1]
  if (last.subtemplateId !== 'cta-final') {
    throw new Error(
      `[T2] DEC-M2-015 violado: último slide do carrossel deve ser cta-final, foi ${last.subtemplateId}`,
    )
  }

  return {
    plans,
    parserResults: parserResultsRaw.filter((r): r is ParseRoteiroResult => r !== null),
  }
}

// ─── Regerar (DEC-M2-013) ───────────────────────────────────────────────────

/**
 * Tags semânticas derivadas do ajustePrompt. Determinam o que muda no plan.
 */
export interface AjusteIntent {
  changeBackground: boolean
  regenerateAssets: boolean
  reduceText: boolean
  rawNote: string
}

const BG_KEYWORDS = /\b(fundo|background|cor|colors?|paleta|claro|escuro|gradient)\b/i
const ASSET_KEYWORDS = /\b(imagem|imagens|produto|asset|foto|figura|bucha|esponja|objeto|ilustra[cç][aã]o)\b/i
const REDUCE_TEXT_KEYWORDS = /\b(diminuir|encurtar|menor|menos\s+texto|menos\s+linhas|reduzir|trim)\b/i

export function classifyAjusteIntent(ajustePrompt: string): AjusteIntent {
  const text = ajustePrompt.trim()
  return {
    changeBackground: BG_KEYWORDS.test(text),
    regenerateAssets: ASSET_KEYWORDS.test(text),
    reduceText: REDUCE_TEXT_KEYWORDS.test(text),
    rawNote: text,
  }
}

/**
 * Escolhe outra variant da mesma family. Usa rotação determinística sobre
 * o índice atual pra evitar repetir o mesmo bgId.
 */
function pickNextVariantSameFamily(currentBgId: string): string {
  const current = T2_BACKGROUNDS.find((b) => b.id === currentBgId)
  if (!current) return currentBgId
  const sameFamily = T2_BACKGROUNDS.filter(
    (b) => b.family === current.family && b.id !== currentBgId,
  )
  if (sameFamily.length === 0) return currentBgId
  return sameFamily[0].id
}

/**
 * Aplica ajustePrompt no SlidePlan retornado. Heurística V1:
 *  - "fundo"/"cor" → troca backgroundId pra outra variant da mesma family
 *  - menciona produto/imagem → marca imageSlots ai_generated com prompt
 *    enriquecido (Sharp Sharp + adendo do usuário)
 *  - "diminuir/encurtar" → adiciona hint via overflowStrategy='truncate-ellipsis'
 *    (text-renderer trunca em vez de shrink)
 *  - default: re-render do mesmo plan
 *
 * cta-final mantém backgroundId fixo (não troca family — DEC-M2-015 exige).
 */
export function applyAjusteToPlan(input: RegerarSlideInput): SlidePlan {
  const intent = classifyAjusteIntent(input.ajustePrompt)
  const original = input.slidePlanOriginal
  let next: SlidePlan = { ...original }

  // 1. Background swap (não aplica em cta-final por causa do footer embutido)
  if (intent.changeBackground && next.subtemplateId !== 'cta-final') {
    next = { ...next, backgroundId: pickNextVariantSameFamily(next.backgroundId) }
  }

  // 2. Regen assets — enriquece o prompt com o ajuste do user
  if (intent.regenerateAssets) {
    next = {
      ...next,
      imageSlots: next.imageSlots.map((slot) => {
        if (slot.source !== 'ai_generated' || !slot.ai) return slot
        return {
          ...slot,
          ai: {
            ...slot.ai,
            prompt: `${slot.ai.prompt}. Additional adjustment: ${intent.rawNote}`,
          },
          // Limpa packKey pra forçar regen no resolveAssets.
          packKey: undefined,
        }
      }),
    }
  }

  // 3. Reduce text — text-renderer trunca em vez de shrink
  if (intent.reduceText) {
    next = {
      ...next,
      textSlots: next.textSlots.map((slot) => ({
        ...slot,
        overflowStrategy: 'truncate-ellipsis',
      })),
    }
  }

  return next
}
