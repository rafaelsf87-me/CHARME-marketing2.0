import type { Template } from '../types'

/**
 * Pipeline Híbrido v2 (T2) — DEC-M2-005, DEC-M2-006.
 *
 * Layout 100% controlado por Sharp/Satori (textos, fundos, footer,
 * margens, caixas, hierarquia). IA isolada apenas em produtos/cenas via
 * `lib/m2/t2/assets/`.
 *
 * `buildPrompt` e `falConfig` ficam undefined — T2 não usa o pipeline
 * fal-prompt-puro do T1. A geração de assets IA isolada é orquestrada
 * via `lib/m2/t2/render.ts`.
 */
export const pipelineHibridoV2: Template = {
  id: 'pipeline-hibrido-v2',
  nome: 'Pipeline Híbrido v2',
  descricao: 'Layout 100% controlado, IA isolada apenas em produtos/cenas.',
  status: 'ativo',
  pipeline: 'hibrido-compositing',
}
