import type { M1RenderInput } from './schema'
import { M1_TIPOS_COM_CENARIO } from './schema'
import { renderPipelineA } from './render-pipeline-a'
import { renderPipelineB } from './render-pipeline-b'

export async function renderM1(input: M1RenderInput): Promise<string> {
  const usaPipelineA = M1_TIPOS_COM_CENARIO.includes(input.tipoFoto)
  return usaPipelineA ? renderPipelineA(input) : renderPipelineB(input)
}
