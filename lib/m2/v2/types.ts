/**
 * M2 V2 (Templates Fixos) — Types
 *
 * Pipeline atômico: 1 input → 1 plan → 1 PNG.
 * Sem carrossel, sem asset pack, sem subtemplate config dinâmico.
 *
 * 3 templates fixos:
 *  - capa-curta:  título alinhado esquerda + 4 ícones cantos + hero centro + card inferior numerado
 *  - capa-longa:  ícone topo centro + título underline + 2-3 bullets esquerda + hero direita
 *  - cta-final:   base capa-curta + botão CTA central rodapé + footer
 *
 * Lógica seleção CAPA-CURTA vs CAPA-LONGA: chars(título)+chars(bullets) ≤ 120 = curta.
 * Override manual via flag `variantOverride`.
 */

import type { M2LogoOption } from '../schema'

// ─── Library ícones brand V2 ────────────────────────────────────────────────

export const V2_ICON_IDS = [
  'casa-coracao',
  'sparkle',
  'estrela',
  'check',
  'coracao',
  'cifrao',
  'etiqueta',
  'escudo',
  'relogio',
  'raio',
  'lampada',
  'x-circulo',
] as const
export type V2IconId = (typeof V2_ICON_IDS)[number]

// ─── Templates ──────────────────────────────────────────────────────────────

export const V2_TEMPLATE_TYPES = ['capa', 'cta-final'] as const
export type V2TemplateType = (typeof V2_TEMPLATE_TYPES)[number]

export const V2_CAPA_VARIANTS = ['capa-curta', 'capa-longa'] as const
export type V2CapaVariant = (typeof V2_CAPA_VARIANTS)[number]

export const V2_VARIANT_OVERRIDE = ['auto', 'forcar-curta', 'forcar-longa'] as const
export type V2VariantOverride = (typeof V2_VARIANT_OVERRIDE)[number]

export const V2_MODO_GERACAO = ['ia', 'upload'] as const
export type V2ModoGeracao = (typeof V2_MODO_GERACAO)[number]

// ─── Canvas ─────────────────────────────────────────────────────────────────

export const V2_CANVAS_WIDTH = 1080
export const V2_CANVAS_HEIGHT = 1350

// ─── Input do user ──────────────────────────────────────────────────────────

export interface V2Input {
  /** 'capa' ou 'cta-final'. */
  templateType: V2TemplateType
  /** Texto livre do briefing (LLM extrai título + bullets + hero prompt). */
  brief: string
  /** Override variant (só relevante quando templateType='capa'). Default 'auto'. */
  variantOverride?: V2VariantOverride
  /** 'ia' (gpt-image-1 gera hero) ou 'upload' (user envia PNG/JPG). Default 'ia'. */
  modoGeracao?: V2ModoGeracao
  /** URL pública do upload (só quando modoGeracao='upload'). */
  imageUploadUrl?: string
  /** Override do prompt do hero IA. Opcional — planner infere se ausente. */
  imagePrompt?: string
  /** Logo brand pro footer (só cta-final). */
  logo: M2LogoOption
  /** Keyword opcional pro filename. */
  keyword?: string
}

// ─── Plano (output do planner, input do renderer) ───────────────────────────

export interface V2Bullet {
  /** Texto literal extraído do brief. */
  texto: string
  /** Ícone escolhido pelo LLM pela semântica do texto. */
  icone: V2IconId
}

export interface V2CardInferior {
  /** Pílula numerada opcional (ex: "1"). */
  numero?: string
  /** Título do card. */
  titulo: string
  /** 0-3 bullets dentro do card. */
  bullets: string[]
}

export interface V2CardInferiorLonga {
  /** Coluna esquerda: texto longo. */
  textoLongo: string
  /** Coluna direita: chamada curta destaque. */
  destaque: string
  /** Ícone do card (esquerda). */
  icone: V2IconId
}

export interface V2BadgeSubtema {
  /** Texto do badge (ex: "GASTANDO POUCO"). */
  texto: string
  /** Ícone na pílula (ex: 'cifrao'). */
  icone: V2IconId
}

export interface V2Plan {
  templateType: V2TemplateType
  /** Variante resolvida (sempre 'capa-curta' quando templateType='cta-final'). */
  variant: V2CapaVariant
  /** Como a variante foi escolhida — auditoria. */
  variantReason: 'auto-curta' | 'auto-longa' | 'override-curta' | 'override-longa' | 'cta-final-forced'
  /** Título (literal do brief). */
  titulo: string
  /** Bullets com ícones (vazio se brief não tem bullets). */
  bullets: V2Bullet[]
  /** Badge sub-tema opcional (CAPA-CURTA). */
  badgeSubtema?: V2BadgeSubtema
  /** Ícone topo central (CAPA-LONGA). Default 'casa-coracao'. */
  iconeTopo?: V2IconId
  /** Card inferior opcional (CAPA-CURTA). */
  cardInferior?: V2CardInferior
  /** Card inferior CTA emocional opcional (CAPA-LONGA). */
  cardInferiorLonga?: V2CardInferiorLonga
  /** Texto do botão CTA central (CTA-FINAL). Literal — não invent. */
  ctaButtonTexto?: string
  /** Hero: prompt IA OU URL upload. */
  hero: {
    source: 'ai_generated' | 'uploaded'
    prompt?: string
    uploadedUrl?: string
  }
  /** Contadores pra debug/auditoria. */
  charCount: {
    titulo: number
    bulletsTotal: number
    total: number
  }
}

// ─── Output do render ───────────────────────────────────────────────────────

export interface V2RenderOutput {
  url: string
  plan: V2Plan
  tookMs: number
  costUsd: number
}
