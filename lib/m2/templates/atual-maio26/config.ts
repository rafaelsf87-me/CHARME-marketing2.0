import type { Template } from '../types'
import { buildT1Prompt } from './prompt'

export const atualMaio26: Template = {
  id: 'atual-maio26',
  nome: 'Atual_Maio26',
  descricao:
    'Réplica do template usado manualmente hoje. Gradient cyan→roxo, Montserrat Bold, layout livre decidido pela IA.',
  status: 'ativo',
  pipeline: 'fal-prompt-puro',
  buildPrompt: buildT1Prompt,
  // Parâmetros FAL validados em 18/05/2026 (DEC-M2-001 RESOLVIDA).
  // Tier promovido pra 'high' após smoke 1 em 'medium' gerar erros de
  // português + hierarquia tipográfica quebrada (Adendo §5).
  falConfig: {
    endpointText: 'fal-ai/gpt-image-1/text-to-image',
    endpointEdit: 'fal-ai/gpt-image-1/edit-image',
    imageSize: '1024x1536',
    quality: 'high',
    outputFormat: 'png',
    background: 'auto',
    inputFidelity: 'high',
    numImages: 1,
  },
}
