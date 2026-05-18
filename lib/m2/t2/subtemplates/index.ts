/**
 * T2 Subtemplate Registry
 *
 * Estado: STUB (Fase 0). Subtemplates implementados em Fases 1+2.
 */

import type { T2SubtemplateId } from '../types'
import type { SubtemplateModule } from './types'

export const T2_SUBTEMPLATES: Partial<Record<T2SubtemplateId, SubtemplateModule>> = {}

export function getSubtemplate(id: T2SubtemplateId): SubtemplateModule {
  const found = T2_SUBTEMPLATES[id]
  if (!found) {
    throw new Error(
      `[T2] subtemplate "${id}" não está registrado — Fase 1/2 ainda não implementou`,
    )
  }
  return found
}
