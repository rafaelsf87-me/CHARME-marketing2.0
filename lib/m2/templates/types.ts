export type TemplateStatus = 'ativo' | 'em-construcao' | 'a-definir'

export type TemplatePipeline = 'fal-prompt-puro' | 'hibrido-compositing' | 'a-definir'

// Schema FAL gpt-image-1 (validado em 18/05/2026 — ver DEC-M2-001 em DIVIDAS).
// Cada template carrega seu próprio falConfig pra permitir tier/endpoint/tamanho
// diferentes por template (T1 ≠ T2 ≠ T3).
export interface FalConfig {
  // Endpoints separados — sem PNGs vai pelo text-to-image, com PNGs pelo edit-image.
  endpointText: string
  endpointEdit: string
  // Tamanhos suportados pelo gpt-image-1 (enum oficial do FAL).
  imageSize: 'auto' | '1024x1024' | '1536x1024' | '1024x1536'
  // 'medium' em 1024×1536 = $0.063/img. 'low' = $0.016. 'high' = $0.25.
  quality: 'auto' | 'low' | 'medium' | 'high'
  outputFormat: 'jpeg' | 'png' | 'webp'
  // T1 precisa do gradient gerado pela IA → 'auto'. Nunca 'transparent' aqui.
  background: 'auto' | 'transparent' | 'opaque'
  // Só aplica no edit-image. 'high' = mais fidelidade às PNGs de referência.
  inputFidelity: 'low' | 'high'
  numImages: number
}

export interface BuildPromptArgs {
  copyTexto: string
  instrucoesExtras?: string
  // Adendo §10 — instruções de uso das PNGs (modo upload). Anexadas ao bloco
  // ADDITIONAL INSTRUCTIONS quando presentes.
  instrucoesUsoImagens?: string
  hasReferences: boolean
  // Carrossel:
  isUltimoSlide?: boolean
  ctaFinal?: string
  contextoGeral?: string
}

export interface Template {
  id: string
  nome: string
  descricao: string
  status: TemplateStatus
  pipeline: TemplatePipeline
  // Disponíveis somente para templates 'ativo' — undefined em placeholders.
  buildPrompt?: (args: BuildPromptArgs) => string
  falConfig?: FalConfig
}
