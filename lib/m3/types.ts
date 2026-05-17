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

// ─── Composição visual (Sub-fase 2.2) ────────────────────────────────────────

export interface M3Cores {
  primary: string
  secondary: string
  accent: string
  cardBg: string
  cardBgEnd: string
}

export interface M3Textos {
  // Texto exibido no círculo do desconto (ex.: "38% OFF", "Até 74% OFF").
  descontoPromo: string
  // Quando true, renderiza "na loja toda" abaixo do desconto.
  naLojaToda?: boolean
  // Asterisco do rodapé (texto longo com observações).
  footer?: string
}

// Cada condição do card. textos[] suporta múltiplas linhas (ex.: FRETE GRÁTIS*
// + subitens *Sul/Sudeste R$200... Outras regiões R$299...).
export interface M3Condicao {
  id: string
  iconePng: Buffer
  textos: string[]
}

// Decoração posicionada pixel-precisa no canvas (corações, etc).
// layer 'back' = compostada antes do título/atriz; 'front' = depois.
export interface M3Decoracao {
  buffer: Buffer
  x: number
  y: number
  w: number
  h: number
  layer: 'back' | 'front'
}

// Contrato unificado consumido por composeDesktop/composeMobile.
export interface M3Layers {
  bg: M3Cores
  textos: M3Textos
  condicoes: M3Condicao[]
  tituloPng: Buffer
  atrizPng: Buffer
  decoracoesPngs: M3Decoracao[]
}
