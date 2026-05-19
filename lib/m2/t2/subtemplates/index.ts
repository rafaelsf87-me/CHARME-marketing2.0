/**
 * T2 Subtemplate Registry
 *
 * Fase 2: 5 subtemplates ativos (cover + content-3-boxes + content-6-boxes +
 * comparison-before-after + cta-final).
 */

import type { T2SubtemplateId } from '../types'
import type { SubtemplateModule } from './types'
import { coverModule } from './cover'
import { content3BoxesModule } from './content-3-boxes'
import { content6BoxesModule } from './content-6-boxes'
import { comparisonBeforeAfterModule } from './comparison-before-after'
import { ctaFinalModule } from './cta-final'
import { imageFocusModule } from './image-focus'

export const T2_SUBTEMPLATES: Record<T2SubtemplateId, SubtemplateModule> = {
  cover: coverModule,
  'content-3-boxes': content3BoxesModule,
  'content-6-boxes': content6BoxesModule,
  'comparison-before-after': comparisonBeforeAfterModule,
  'cta-final': ctaFinalModule,
  'image-focus': imageFocusModule,
}

export function getSubtemplate(id: T2SubtemplateId): SubtemplateModule {
  const found = T2_SUBTEMPLATES[id]
  if (!found) {
    throw new Error(`[T2] subtemplate "${id}" não está registrado`)
  }
  return found
}
