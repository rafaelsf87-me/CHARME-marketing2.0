/**
 * T2 Subtemplate Registry
 *
 * Fase 1: apenas `cover`. Outros subtemplates entram na Fase 2.
 */

import type { T2SubtemplateId } from '../types'
import type { SubtemplateModule } from './types'
import { coverModule } from './cover'

export const T2_SUBTEMPLATES: Partial<Record<T2SubtemplateId, SubtemplateModule>> = {
  cover: coverModule,
}

export function getSubtemplate(id: T2SubtemplateId): SubtemplateModule {
  const found = T2_SUBTEMPLATES[id]
  if (!found) {
    throw new Error(
      `[T2] subtemplate "${id}" não está registrado — Fase 1/2 ainda não implementou`,
    )
  }
  return found
}
