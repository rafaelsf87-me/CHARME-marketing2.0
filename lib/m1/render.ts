import type { M1RenderInput } from './schema'
import { renderPipelineAToUrl } from './render-pipeline-a'
import { renderPipelineDetalhe } from './render-pipeline-detalhe'
import { getTemplateById } from './templates'

// Orquestrador único.
// - Detalhe Tecido com template variant=split: roda renderPipelineDetalhe (compositing close+zoom).
// - Demais casos (incluindo Detalhe Tecido variant=simple): roda Pipeline A direto.
export async function renderM1(input: M1RenderInput): Promise<string> {
  if (input.tipoFoto === 'detalhe-tecido') {
    const template = getTemplateById(input.cenarioId)
    if (template?.variant === 'split') {
      return renderPipelineDetalhe(input)
    }
  }
  return renderPipelineAToUrl(input)
}
