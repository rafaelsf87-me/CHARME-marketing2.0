/**
 * T2 Background Selector
 *
 * Invariante I7: todos os slides de um carrossel usam mesma family.
 * Variants alternam pra evitar repetir igual entre slides adjacentes.
 */

import type { BackgroundConfig } from '../types'
import {
  T2_BACKGROUNDS,
  getCarouselEligibleBackgrounds,
  getSingleEligibleBackgrounds,
} from './catalog'

/** Lista de families elegíveis pra carrossel (com >= 3 variants). */
export function listCarouselEligibleFamilies(): string[] {
  const eligible = getCarouselEligibleBackgrounds()
  return Array.from(new Set(eligible.map((b) => b.family)))
}

/**
 * Seleciona background pro carrossel respeitando I7 (mesma family).
 *
 * - Slide 0: escolhe family (preferindo primeira elegível) e primeiro variant
 *   compatível com posição/preferência.
 * - Slide N>0: alterna variants da MESMA family escolhida no slide 0.
 *   Evita repetir igual ao slide adjacente (previousBgIds[N-1]).
 *
 * @param slideIndex 0..N
 * @param previousBgIds bgIds escolhidos pros slides 0..slideIndex-1
 * @param preferredFamily se omitido, deduzido de previousBgIds[0]
 */
export function chooseBackgroundForCarousel(
  slideIndex: number,
  previousBgIds: string[],
  preferredFamily?: string,
): BackgroundConfig {
  const eligible = getCarouselEligibleBackgrounds()
  if (eligible.length === 0) {
    throw new Error('[T2] nenhum background elegível pra carrossel — catálogo precisa ter family com ≥3 variants em allowedFormats=carrossel')
  }

  // Resolve family.
  let family = preferredFamily
  if (!family && previousBgIds.length > 0) {
    const first = T2_BACKGROUNDS.find((b) => b.id === previousBgIds[0])
    family = first?.family
  }
  if (!family) {
    family = listCarouselEligibleFamilies()[0]
  }

  // Filtra variants da family.
  const variants = eligible.filter((b) => b.family === family)
  if (variants.length === 0) {
    throw new Error(`[T2] family "${family}" não tem variants elegíveis pra carrossel`)
  }

  // Evita repetir o último bgId escolhido.
  const lastUsedId = previousBgIds.length > 0 ? previousBgIds[previousBgIds.length - 1] : null
  const candidates = variants.filter((b) => b.id !== lastUsedId)
  const pool = candidates.length > 0 ? candidates : variants

  // Rotação determinística pra evitar repetir padrão entre slides.
  // slideIndex 0 → primeiro pool; slideIndex 1 → próximo; etc.
  const picked = pool[slideIndex % pool.length]
  return picked
}

/**
 * Seleciona background pra imagem-única.
 *
 * @param preferredFamily opcional. Se omitido, pega primeiro elegível.
 */
export function chooseBackgroundForSingle(preferredFamily?: string): BackgroundConfig {
  const eligible = getSingleEligibleBackgrounds()
  if (eligible.length === 0) {
    throw new Error('[T2] nenhum background elegível pra imagem-única')
  }
  if (preferredFamily) {
    const inFamily = eligible.find((b) => b.family === preferredFamily)
    if (inFamily) return inFamily
  }
  return eligible[0]
}

/**
 * Hard check: garante que todos os slides do carrossel usam mesma family.
 * Falha se detectar mistura (sinal de bug no Planner).
 */
export function assertSameFamilyAcrossCarousel(bgIds: string[]): void {
  if (bgIds.length === 0) return
  const families = bgIds.map((id) => {
    const bg = T2_BACKGROUNDS.find((b) => b.id === id)
    if (!bg) throw new Error(`[T2] bgId "${id}" não está no catálogo`)
    return bg.family
  })
  const first = families[0]
  for (let i = 1; i < families.length; i++) {
    if (families[i] !== first) {
      throw new Error(
        `[T2] mistura de families no carrossel: slide 0=${first}, slide ${i}=${families[i]}. ` +
          `Viola invariante I7.`,
      )
    }
  }
}
