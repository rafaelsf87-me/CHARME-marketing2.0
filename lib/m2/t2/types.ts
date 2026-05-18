/**
 * M2 Pipeline Híbrido v2 (T2) — Types
 *
 * Fonte única de verdade dos contratos JSON do T2.
 * Mudanças aqui sempre acompanhadas de atualização em schema.ts (Zod).
 *
 * Ler README.md desta pasta antes de tocar.
 */

import type { M2LogoOption } from '../schema'

// ============================================================================
// Subtemplates V1 (DEC-M2-005 + acréscimo Rafael)
// ============================================================================

export const T2_SUBTEMPLATE_IDS = [
  'cover',
  'content-3-boxes',
  'content-6-boxes',
  'cta-final',
  'comparison-before-after',
] as const
export type T2SubtemplateId = (typeof T2_SUBTEMPLATE_IDS)[number]

export const T2_SLIDE_TYPES = [
  'cover',
  'content_3',
  'content_6',
  'cta_final',
  'comparison',
  'imagem_unica',
] as const
export type T2SlideType = (typeof T2_SLIDE_TYPES)[number]

// ============================================================================
// Geometria
// ============================================================================

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Inset {
  top: number
  right: number
  bottom: number
  left: number
}

// Canvas final do M2: 1080×1350 (4:5). Outros valores são erro de QC.
export const T2_CANVAS_WIDTH = 1080
export const T2_CANVAS_HEIGHT = 1350

// ============================================================================
// SlotRef — onde um text/image slot é renderizado
// ============================================================================

export type SlotRef =
  | { kind: 'subtemplate-slot'; id: string }
  | { kind: 'absolute'; rect: Rect }

// ============================================================================
// TextSlot — texto renderizado pelo text-renderer determinístico
// ============================================================================

export type TextOverflowStrategy = 'shrink' | 'truncate-ellipsis' | 'error'

export interface TextSlot {
  id: string
  content: string
  slotRef: SlotRef
  alignment?: 'left' | 'center' | 'right'
  overflowStrategy?: TextOverflowStrategy
}

// ============================================================================
// ImageSlot — imagem composta por Sharp dentro do slot
//
// INVARIANTE (DEC-M2-014): quando source === 'uploaded', o arquivo é ASSET
// PRONTO. Compose Sharp direto sobre o background. NÃO enviar pro GPT Image.
// Ver README.md > "Política de Upload".
// ============================================================================

export type ImageSlotSource =
  | 'ai_generated'
  | 'uploaded'
  | 'reused-from-pack'
  | 'static-asset'

export type AssetType = 'product' | 'scene' | 'icon'

export type ImageTreatment =
  | 'transparent-cutout'
  | 'rounded'
  | 'circle'
  | 'raw'

export interface ImageSlot {
  id: string
  source: ImageSlotSource
  slotRef: SlotRef
  treatment?: ImageTreatment
  /** Quando source === 'ai_generated' */
  ai?: { prompt: string; assetType: AssetType }
  /** Quando source === 'uploaded'. URL do user. */
  uploadedUrl?: string
  /** Quando source === 'reused-from-pack'. Chave no CarouselAssetPack. */
  packKey?: string
  /** Quando source === 'static-asset'. Path em /public/brand/m2/... */
  staticPath?: string
}

// ============================================================================
// SlidePlan — output do Planner, input do Renderer
// ============================================================================

export interface SlidePlanFooter {
  enabled: boolean
  logo: M2LogoOption
  position: 'bottom-center'
}

export interface SlidePlan {
  slideId: string
  slideIndex: number
  slideType: T2SlideType
  backgroundId: string
  subtemplateId: T2SubtemplateId
  textSlots: TextSlot[]
  imageSlots: ImageSlot[]
  footer: SlidePlanFooter
  /** Hash do CarouselAssetPack, se houver assets reusados entre slides. */
  assetPackRef?: string
}

// ============================================================================
// BackgroundConfig — catálogo (DEC: assets manuais, não gerados via IA)
// ============================================================================

export type BackgroundPosition =
  | 'cover-fit'
  | 'top-anchored'
  | 'bottom-anchored'
  | 'centered'

export type BackgroundContrast = 'light-text' | 'dark-text'

export type BackgroundDensity = 'sparse' | 'busy'

export interface BackgroundPalette {
  primary: string
  secondary: string
  accent?: string
}

export interface BackgroundConfig {
  id: string
  file: string
  /** Family identifica grupo de continuidade visual (ex: 'gradient-roxo'). */
  family: string
  position: BackgroundPosition
  palette: BackgroundPalette
  /** Margens onde texto não pode invadir. Px relativos a 1080×1350. */
  safeAreas: Inset
  contrast: BackgroundContrast
  density: BackgroundDensity
}

// ============================================================================
// SubtemplateConfig — definição estática dos slots de cada subtemplate
// ============================================================================

export type FontStack = 'display' | 'body' | 'caption'

export interface TextSlotDef {
  id: string
  box: Rect
  fontStack: FontStack
  fontWeight: 400 | 500 | 600 | 700 | 800
  fontSizeMin: number
  fontSizeMax: number
  lineHeight: number
  /** Se omitido, herda de background.contrast (light/dark) via render time. */
  color?: string
}

export interface ImageSlotDef {
  id: string
  box: Rect
  /** Se true, slot aceita upload do user. Demais slots: sempre IA/estático. */
  acceptsUpload: boolean
  defaultTreatment?: ImageTreatment
}

export interface SubtemplateConfig {
  id: T2SubtemplateId
  textSlots: TextSlotDef[]
  imageSlots: ImageSlotDef[]
  density: BackgroundDensity | 'medium'
  /** Ids ou families compatíveis. '*' = qualquer. */
  compatibleBackgrounds: string[]
}

// ============================================================================
// CarouselAssetPack — cache em memória por-request (DEC-M2-007)
//
// Reaproveita produto principal entre slides do mesmo carrossel.
// Vida útil: 1 request. Nunca persiste entre requests.
// ============================================================================

export interface AssetPackEntry {
  url: string
  promptHash: string
  assetType: AssetType
  transparent: boolean
}

export interface CarouselAssetPack {
  packHash: string
  createdAt: string
  assets: Record<string, AssetPackEntry>
}

// ============================================================================
// QCReport (DEC-M2-008) — validador programático
// ============================================================================

export type QCErrorCode =
  | 'CANVAS_DIM_WRONG'
  | 'TEXT_OUTSIDE_SAFE_AREA'
  | 'TEXT_TRUNCATED'
  | 'FOOTER_MISSING'
  | 'FOOTER_PARTIAL'
  | 'IMAGE_SLOT_EMPTY'
  | 'BACKGROUND_LUMA_VS_TEXT'
  | 'BLEED_CHECK_FAILED'
  | 'UPLOAD_LEAKED_REFERENCE'

export type QCSeverity = 'error' | 'warning'

export interface QCIssueBase {
  code: QCErrorCode
  severity: QCSeverity
  message: string
}

export interface QCIssueCanvasDim extends QCIssueBase {
  code: 'CANVAS_DIM_WRONG'
  expected: [number, number]
  got: [number, number]
}

export interface QCIssueTextOutsideSafeArea extends QCIssueBase {
  code: 'TEXT_OUTSIDE_SAFE_AREA'
  slotId: string
  box: Rect
}

export interface QCIssueTextTruncated extends QCIssueBase {
  code: 'TEXT_TRUNCATED'
  slotId: string
  originalLen: number
  renderedLen: number
}

export interface QCIssueFooterMissing extends QCIssueBase {
  code: 'FOOTER_MISSING'
}

export interface QCIssueFooterPartial extends QCIssueBase {
  code: 'FOOTER_PARTIAL'
  coverage: number
}

export interface QCIssueImageSlotEmpty extends QCIssueBase {
  code: 'IMAGE_SLOT_EMPTY'
  slotId: string
}

export interface QCIssueLumaVsText extends QCIssueBase {
  code: 'BACKGROUND_LUMA_VS_TEXT'
  bgLuma: number
  textLuma: number
  ratio: number
}

export interface QCIssueBleed extends QCIssueBase {
  code: 'BLEED_CHECK_FAILED'
  edge: 'top' | 'right' | 'bottom' | 'left'
}

/**
 * Warning emitido quando OCR detecta texto longo dentro de bounding box de
 * imageSlot com source === 'uploaded'. Sinal de vazamento de referência
 * (upload usado pra prompt em vez de asset pronto — viola DEC-M2-014).
 */
export interface QCIssueUploadLeak extends QCIssueBase {
  code: 'UPLOAD_LEAKED_REFERENCE'
  slotId: string
  detectedTextLength: number
}

export type QCIssue =
  | QCIssueCanvasDim
  | QCIssueTextOutsideSafeArea
  | QCIssueTextTruncated
  | QCIssueFooterMissing
  | QCIssueFooterPartial
  | QCIssueImageSlotEmpty
  | QCIssueLumaVsText
  | QCIssueBleed
  | QCIssueUploadLeak

export interface QCReport {
  pass: boolean
  qualityScore: number
  errors: QCIssue[]
  warnings: QCIssue[]
}

// ============================================================================
// T2 Input — payload do form / API
// ============================================================================

export type T2Modo = 'imagem-unica' | 'carrossel'

export interface T2SlideInput {
  /** Texto base do slide (10..2000 chars). Planner deriva textSlots. */
  copyTexto: string
  /** Upload opcional pro slot image-main. Compose direto, NÃO vai pra IA. */
  imageMainUploadUrl?: string
  /** Prompt explícito para asset IA, opcional. Se ausente, Planner infere. */
  imageMainPrompt?: string
  /** Ajustes adicionais por-slide (max 500). */
  ajustesExtras?: string
}

export interface T2Input {
  modo: T2Modo
  templateId: string
  logo: M2LogoOption
  /** Tema do carrossel (contexto compartilhado entre slides). */
  contextoGeral?: string
  /** Carrossel: 2..8 slides. Imagem única: array com 1 elemento. */
  slides: T2SlideInput[]
  /** Keyword opcional pra nome do arquivo (compartilhado com lib/filename.ts). */
  keyword?: string
}

// ============================================================================
// Regerar slide individual (DEC-M2-013)
// ============================================================================

export interface RegerarSlideInput {
  slidePlanOriginal: SlidePlan
  slideIndex: number
  ajustePrompt: string
  /** Pack do carrossel original — reusa assets sem regerar salvo quando ajuste pede. */
  packAssets: CarouselAssetPack | null
  /** Original full input — necessário se ajuste regenerar asset principal. */
  contextoOriginal: T2Input
}

// ============================================================================
// Render output
// ============================================================================

export interface SlideRenderResult {
  slideIndex: number
  slideId: string
  url: string
  qc: QCReport
}

export interface T2RenderOutput {
  results: SlideRenderResult[]
  /** Pack final — devolvido pro client guardar e reusar em regerar. */
  pack: CarouselAssetPack | null
  tookMs: number
}
