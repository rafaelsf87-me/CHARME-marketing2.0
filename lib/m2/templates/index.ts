import { pipelineHibridoV2 } from './pipeline-hibrido-v2/config'
import { v2FixosTemplate } from './v2-fixos/config'
import type { Template } from './types'
import type { M2TemplateId } from '../schema'

/**
 * Registry funcional: apenas templates ativos no UI (decisão executiva 19/05/2026).
 *
 * V2.0 (branch feat/v2-templates): `v2-fixos` substitui `EM_BREVE_PLACEHOLDER`.
 * Em main, placeholder continua até merge aprovado.
 */
const REGISTRY: Partial<Record<M2TemplateId, Template>> = {
  'pipeline-hibrido-v2': pipelineHibridoV2,
  'v2-fixos': v2FixosTemplate,
}

export function getTemplate(id: M2TemplateId): Template | undefined {
  return REGISTRY[id]
}

export function listTemplates(): Template[] {
  return Object.values(REGISTRY).filter((t): t is Template => !!t)
}
