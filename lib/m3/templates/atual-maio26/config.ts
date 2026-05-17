import type { Template } from '../../types'
import { buildTituloPrompt } from './prompt'

// T1 ativo do M3 — Pipeline Híbrido (ver DEC-M3-001).
// FalConfig do título validado em smoke (DEC-M3-002): high tier, 1536x1024,
// background transparent. Mesmos parâmetros pra qualquer texto PT-BR.
export const atualMaio26: Template = {
  id: 'atual-maio26',
  nome: 'Atual_Maio26',
  descricao:
    'Template "Descontão de Mãe" — Pipeline Híbrido com Sharp/Satori controlando layout e gpt-image-1 high gerando título 3D balão isolado.',
  status: 'ativo',
  pipeline: 'hibrido',
  buildTituloPrompt,
  falConfig: {
    endpointText: 'fal-ai/gpt-image-1/text-to-image',
    imageSize: '1536x1024',
    quality: 'high',
    outputFormat: 'png',
    background: 'transparent',
    numImages: 1,
  },
}
