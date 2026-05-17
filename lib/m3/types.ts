// Tipos base do M3 Banners Website — Pipeline Híbrido (v1.0).
// Refinamento dos schemas de input completos (atriz, decorações, condições)
// fica pra Fase 2/3. Esta Fase 1 cobre apenas o pipeline do título isolado.

export type TemplateStatus = 'ativo' | 'placeholder'

export type TemplatePipeline = 'hibrido' | 'a-definir'

// Schema FAL gpt-image-1 — subset do M2 ajustado pro M3.
// M3 só usa text-to-image (sem refs). Background é sempre 'transparent' pro
// título isolado e pra atriz (Fase 2). M3 não usa edit-image no V1.
export interface FalConfig {
  endpointText: string
  imageSize: '1024x1024' | '1536x1024' | '1024x1536' | 'auto'
  quality: 'auto' | 'low' | 'medium' | 'high'
  outputFormat: 'jpeg' | 'png' | 'webp'
  background: 'auto' | 'transparent' | 'opaque'
  numImages: number
}

export interface Template {
  id: string
  nome: string
  descricao: string
  status: TemplateStatus
  pipeline: TemplatePipeline
  // Disponíveis apenas em templates 'ativo' — undefined em placeholders.
  buildTituloPrompt?: (texto: string) => string
  falConfig?: FalConfig
}
