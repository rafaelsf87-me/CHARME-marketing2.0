import { pipelineHibridoV2 } from './pipeline-hibrido-v2/config'
import type { Template } from './types'
import type { M2TemplateId } from '../schema'

/**
 * Registry funcional: apenas templates ativos no UI (decisão executiva 19/05/2026).
 *
 * T1 (`atual-maio26`), `atual-maio26-new` e `novo-teste-1` foram removidos do
 * UI mas seus arquivos sob `lib/m2/templates/*` permanecem em disco por 30
 * dias como segurança de rollback (ver [REF-M2-005] em DIVIDAS_PROJETO).
 *
 * A rota `/api/imagens/m2/generate` (T1) também segue intacta no mesmo prazo.
 */
const REGISTRY: Partial<Record<M2TemplateId, Template>> = {
  'pipeline-hibrido-v2': pipelineHibridoV2,
}

/**
 * Placeholder "Em breve" exibido apenas no UI. Não tem id no enum
 * `M2TemplateId` (literal `'em-breve-1'`), portanto requests com esse id
 * são rejeitadas no zod parse — o card é disabled.
 */
const EM_BREVE_PLACEHOLDER: Template = {
  id: 'em-breve-1',
  nome: 'Em breve',
  descricao: 'Novo template em desenvolvimento.',
  status: 'em-breve',
  pipeline: 'a-definir',
}

export function getTemplate(id: M2TemplateId): Template | undefined {
  return REGISTRY[id]
}

export function listTemplates(): Template[] {
  return [
    ...Object.values(REGISTRY).filter((t): t is Template => !!t),
    EM_BREVE_PLACEHOLDER,
  ]
}
