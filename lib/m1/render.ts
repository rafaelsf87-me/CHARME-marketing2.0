import type { M1RenderInput } from './schema'
import { renderPipelineAToUrl } from './render-pipeline-a'
import { renderPipelineDetalhe } from './render-pipeline-detalhe'
import { getTemplate } from './templates'

// Orquestrador único (v1.3 — input usa `set`, template resolvido via helper).
// - Detalhe Tecido com template variant=split (sofá): renderPipelineDetalhe.
// - Demais casos (incluindo Detalhe Tecido cadeira): renderPipelineA.
// Sofá Detalhe Set 2 cai no fallback do getTemplate (retorna sofa-detalhe-1).
export async function renderM1(input: M1RenderInput): Promise<string> {
  if (input.tipoFoto === 'detalhe-tecido') {
    const template = getTemplate(input.movel, input.tipoFoto, input.set)
    if (template.variant === 'split') {
      return renderPipelineDetalhe(input)
    }
  }
  return renderPipelineAToUrl(input)
}
