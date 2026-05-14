import type { M1RenderInput } from './schema'
import { renderPipelineAToUrl } from './render-pipeline-a'
import { renderPipelineDetalhe } from './render-pipeline-detalhe'

// Orquestrador único: Pipeline A para 3 dos 4 tipos; Detalhe Tecido
// usa o orquestrador split-screen que internamente chama Pipeline A 2×.
export async function renderM1(input: M1RenderInput): Promise<string> {
  if (input.tipoFoto === 'detalhe-tecido') {
    return renderPipelineDetalhe(input)
  }
  return renderPipelineAToUrl(input)
}
