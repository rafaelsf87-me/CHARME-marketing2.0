/**
 * T2 Background Selector
 *
 * Estado: STUB (Fase 0). Lógica em Fase 2.
 *
 * Invariante (I7): todos os slides de um carrossel usam mesma family.
 * Variants alternam entre slides pra continuidade visual sem repetir
 * idêntico.
 *
 * Estratégia (Fase 2):
 * - chooseFamily(t2Input): infere family por contextoGeral + palette dominante
 * - chooseVariantForSlide(family, slideIndex, slideType, prevVariantIds):
 *   pega próxima variant não usada da family, preferindo `position`
 *   compatível com slideType
 */

import type { T2Input, T2SlideType, BackgroundConfig } from '../types'

export function chooseFamily(_input: T2Input): string {
  throw new Error('[T2] backgrounds.chooseFamily — Fase 2 não implementada')
}

export function chooseVariantForSlide(_args: {
  family: string
  slideIndex: number
  slideType: T2SlideType
  prevVariantIds: string[]
}): BackgroundConfig {
  throw new Error('[T2] backgrounds.chooseVariantForSlide — Fase 2 não implementada')
}
