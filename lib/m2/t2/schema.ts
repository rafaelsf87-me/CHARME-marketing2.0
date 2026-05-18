/**
 * M2 Pipeline Híbrido v2 (T2) — Zod schemas
 *
 * Mantém paridade com types.ts. Mudanças em types.ts → atualizar aqui.
 */

import { z } from 'zod'
import { brandM2 } from '@/lib/brand/m2.brand'
import { M2_LOGO_OPTIONS } from '../schema'
import { T2_SUBTEMPLATE_IDS, T2_SLIDE_TYPES } from './types'

// ============================================================================
// Geometria
// ============================================================================

export const rectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number().positive(),
  h: z.number().positive(),
})

export const insetSchema = z.object({
  top: z.number().nonnegative(),
  right: z.number().nonnegative(),
  bottom: z.number().nonnegative(),
  left: z.number().nonnegative(),
})

// ============================================================================
// SlotRef
// ============================================================================

export const slotRefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('subtemplate-slot'), id: z.string().min(1) }),
  z.object({ kind: z.literal('absolute'), rect: rectSchema }),
])

// ============================================================================
// TextSlot / ImageSlot
// ============================================================================

export const textSlotSchema = z.object({
  id: z.string().min(1),
  content: z.string(),
  slotRef: slotRefSchema,
  alignment: z.enum(['left', 'center', 'right']).optional(),
  overflowStrategy: z.enum(['shrink', 'truncate-ellipsis', 'error']).optional(),
})

export const imageSlotSchema = z
  .object({
    id: z.string().min(1),
    source: z.enum(['ai_generated', 'uploaded', 'reused-from-pack', 'static-asset']),
    slotRef: slotRefSchema,
    treatment: z.enum(['transparent-cutout', 'rounded', 'circle', 'raw']).optional(),
    ai: z
      .object({
        prompt: z.string().min(1),
        assetType: z.enum(['product', 'scene', 'icon']),
      })
      .optional(),
    uploadedUrl: z.string().url().optional(),
    packKey: z.string().min(1).optional(),
    staticPath: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.source === 'ai_generated' && !data.ai) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'ai required when source=ai_generated', path: ['ai'] })
    }
    if (data.source === 'uploaded' && !data.uploadedUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'uploadedUrl required when source=uploaded', path: ['uploadedUrl'] })
    }
    if (data.source === 'reused-from-pack' && !data.packKey) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'packKey required when source=reused-from-pack', path: ['packKey'] })
    }
    if (data.source === 'static-asset' && !data.staticPath) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'staticPath required when source=static-asset', path: ['staticPath'] })
    }
  })

// ============================================================================
// SlidePlan
// ============================================================================

export const slidePlanFooterSchema = z.object({
  enabled: z.boolean(),
  logo: z.enum(M2_LOGO_OPTIONS),
  position: z.literal('bottom-center'),
})

export const slidePlanSchema = z.object({
  slideId: z.string().min(1),
  slideIndex: z.number().int().nonnegative(),
  slideType: z.enum(T2_SLIDE_TYPES),
  backgroundId: z.string().min(1),
  subtemplateId: z.enum(T2_SUBTEMPLATE_IDS),
  textSlots: z.array(textSlotSchema),
  imageSlots: z.array(imageSlotSchema),
  footer: slidePlanFooterSchema,
  assetPackRef: z.string().min(1).optional(),
})

// ============================================================================
// BackgroundConfig / SubtemplateConfig
// ============================================================================

export const backgroundConfigSchema = z.object({
  id: z.string().min(1),
  file: z.string().min(1),
  family: z.string().min(1),
  position: z.enum(['cover-fit', 'top-anchored', 'bottom-anchored', 'centered']),
  palette: z.object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
  safeAreas: insetSchema,
  contrast: z.enum(['light-text', 'dark-text']),
  density: z.enum(['sparse', 'busy']),
  allowedFormats: z.array(z.enum(['carrossel', 'imagem-unica'])).min(1),
})

export const subtemplateConfigSchema = z.object({
  id: z.enum(T2_SUBTEMPLATE_IDS),
  textSlots: z.array(
    z.object({
      id: z.string().min(1),
      box: rectSchema,
      fontStack: z.enum(['display', 'body', 'caption']),
      fontWeight: z.union([
        z.literal(400),
        z.literal(500),
        z.literal(600),
        z.literal(700),
        z.literal(800),
      ]),
      fontSizeMin: z.number().positive(),
      fontSizeMax: z.number().positive(),
      lineHeight: z.number().positive(),
      maxLines: z.number().int().positive(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }),
  ),
  imageSlots: z.array(
    z.object({
      id: z.string().min(1),
      box: rectSchema,
      acceptsUpload: z.boolean(),
      defaultTreatment: z.enum(['transparent-cutout', 'rounded', 'circle', 'raw']).optional(),
    }),
  ),
  density: z.enum(['sparse', 'medium', 'busy']),
  compatibleBackgrounds: z.array(z.string().min(1)),
})

// ============================================================================
// CarouselAssetPack
// ============================================================================

export const assetPackEntrySchema = z.object({
  url: z.string().url(),
  promptHash: z.string().min(1),
  assetType: z.enum(['product', 'scene', 'icon']),
  transparent: z.boolean(),
})

export const carouselAssetPackSchema = z.object({
  packHash: z.string().min(1),
  createdAt: z.string().datetime(),
  assets: z.record(z.string(), assetPackEntrySchema),
})

// ============================================================================
// T2 Input — payload do form / API
// ============================================================================

export const t2SlideInputSchema = z.object({
  copyTexto: z.string().min(10).max(2000),
  slideType: z.enum(T2_SLIDE_TYPES).optional(),
  subtemplateId: z.enum(T2_SUBTEMPLATE_IDS).optional(),
  slots: z.record(z.string(), z.string().max(500)).optional(),
  bullets: z.array(z.string().max(200)).max(8).optional(),
  imageMainUploadUrl: z.string().url().optional(),
  imageMainPrompt: z.string().max(500).optional(),
  ajustesExtras: z.string().max(500).optional(),
})

export const t2InputSchema = z
  .object({
    modo: z.enum(['imagem-unica', 'carrossel']),
    templateId: z.string().min(1),
    logo: z.enum(M2_LOGO_OPTIONS),
    contextoGeral: z.string().max(500).optional(),
    slides: z
      .array(t2SlideInputSchema)
      .min(1)
      .max(brandM2.pipeline.carouselSlidesRange.max),
    keyword: z.string().max(20).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.modo === 'imagem-unica' && data.slides.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'modo=imagem-unica exige exatamente 1 slide',
        path: ['slides'],
      })
    }
    if (data.modo === 'carrossel' && data.slides.length < brandM2.pipeline.carouselSlidesRange.min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `carrossel exige no mínimo ${brandM2.pipeline.carouselSlidesRange.min} slides`,
        path: ['slides'],
      })
    }
  })

export type T2InputParsed = z.infer<typeof t2InputSchema>

// ============================================================================
// Regerar slide individual (DEC-M2-013)
// ============================================================================

export const regerarSlideInputSchema = z.object({
  slidePlanOriginal: slidePlanSchema,
  slideIndex: z.number().int().nonnegative(),
  ajustePrompt: z.string().min(5).max(500),
  packAssets: carouselAssetPackSchema.nullable(),
  contextoOriginal: t2InputSchema,
})

export type RegerarSlideInputParsed = z.infer<typeof regerarSlideInputSchema>
