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
  RegerarSlideInput,
  SlidePlan,
  SlidePlanFooter,
  T2Input,
  T2SlideInput,
  T2SlideType,
  T2SubtemplateId,
} from './types'
import { chooseBackgroundForCarousel } from './backgrounds/select'
import { T2_BACKGROUNDS } from './backgrounds/catalog'
import { slidePlanSchema } from './schema'

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
}): SlidePlan {
  const { title, subtitle } = parseCoverText(args.input.copyTexto)
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
        content: subtitle,
        slotRef: { kind: 'subtemplate-slot', id: 'subtitle' },
        overflowStrategy: 'shrink',
      },
    ],
    imageSlots: [],
    footer: defaultFooter(),
  }
}

function buildContentPlan(args: {
  index: number
  input: T2SlideInput
  backgroundId: string
  subtemplateId: 'content-3-boxes' | 'content-6-boxes'
}): SlidePlan {
  const bullets = parseBullets(args.input)
  // Primeira linha pode ser título do slide se vier antes dos bullets em
  // copyTexto. Heurística simples: se bullets[0] não começa com letra
  // maiúscula curta, tratá-lo como título.
  let title = args.input.slots?.title ?? ''
  let boxes = bullets
  if (!title && bullets.length > 0 && bullets[0].length < 60) {
    // Se primeiro item parece título (curto), promove pra título.
    // Mas só se vier explícito via slots OU se identificarmos padrão.
    if (args.input.slots?.title) {
      title = args.input.slots.title
    } else if (bullets.length > (args.subtemplateId === 'content-6-boxes' ? 4 : 2)) {
      title = bullets[0]
      boxes = bullets.slice(1)
    }
  }

  const maxBoxes = args.subtemplateId === 'content-6-boxes' ? 6 : 3
  const boxesLimited = boxes.slice(0, maxBoxes)

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
    imageSlots: [],
    footer: defaultFooter(),
  }
}

function buildComparisonPlan(args: {
  index: number
  input: T2SlideInput
  backgroundId: string
}): SlidePlan {
  const slots = args.input.slots ?? {}
  const labelBefore = slots.labelBefore ?? 'ANTES'
  const labelAfter = slots.labelAfter ?? 'DEPOIS'
  const caption = slots.caption ?? ''

  // Title: primeira linha do copyTexto OU slots.title
  const lines = args.input.copyTexto.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const title = slots.title ?? lines[0] ?? ''

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
    imageSlots: [
      {
        id: 'image-before',
        source: args.input.imageMainUploadUrl ? 'uploaded' : 'static-asset',
        slotRef: { kind: 'subtemplate-slot', id: 'image-before' },
        uploadedUrl: args.input.imageMainUploadUrl,
        // Static placeholder. Em Fase 3 vai virar ai_generated.
        staticPath: args.input.imageMainUploadUrl
          ? undefined
          : '/brand/m2/placeholders/neutral-1.png',
        treatment: 'rounded',
      },
      {
        id: 'image-after',
        source: 'static-asset',
        slotRef: { kind: 'subtemplate-slot', id: 'image-after' },
        staticPath: '/brand/m2/placeholders/neutral-2.png',
        treatment: 'rounded',
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
}): SlidePlan {
  const slots = args.input.slots ?? {}
  const lines = args.input.copyTexto.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const title = slots.title ?? lines[0] ?? ''
  const subtitle = slots.subtitle ?? lines.slice(1, 2).join(' ')
  const cta = slots.cta ?? '@charmedodetalhe'

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
    imageSlots: [],
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

export function buildSlidePlan(input: T2Input): SlidePlan[] {
  const ctaBgId = resolveCtaBackgroundId()

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
        plan = buildComparisonPlan({ index: i, input: slide, backgroundId })
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

/**
 * Aplica ajustePrompt no regerar. Stub Fase 4.
 */
export function applyAjusteToPlan(_input: RegerarSlideInput): SlidePlan {
  throw new Error('[T2] planner.applyAjusteToPlan — Fase 4 não implementada')
}
