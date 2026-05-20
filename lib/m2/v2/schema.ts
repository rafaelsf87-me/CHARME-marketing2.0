/**
 * M2 V2 — Zod schemas
 *
 * Mantém paridade com types.ts. Mudanças em types.ts → atualizar aqui.
 */

import { z } from 'zod'
import { M2_LOGO_OPTIONS } from '../schema'
import {
  V2_ICON_IDS,
  V2_TEMPLATE_TYPES,
  V2_CAPA_VARIANTS,
  V2_VARIANT_OVERRIDE,
  V2_MODO_GERACAO,
} from './types'

// ─── Input ──────────────────────────────────────────────────────────────────

export const v2InputSchema = z
  .object({
    templateType: z.enum(V2_TEMPLATE_TYPES),
    brief: z.string().min(10).max(2000),
    variantOverride: z.enum(V2_VARIANT_OVERRIDE).default('auto'),
    modoGeracao: z.enum(V2_MODO_GERACAO).default('ia'),
    imageUploadUrl: z.string().url().optional(),
    imagePrompt: z.string().max(500).optional(),
    logo: z.enum(M2_LOGO_OPTIONS),
    keyword: z.string().max(20).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.modoGeracao === 'upload' && !data.imageUploadUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'modoGeracao=upload exige imageUploadUrl',
        path: ['imageUploadUrl'],
      })
    }
  })

export type V2InputParsed = z.infer<typeof v2InputSchema>

// ─── Plan ───────────────────────────────────────────────────────────────────

export const v2BulletSchema = z.object({
  texto: z.string().min(1).max(200),
  icone: z.enum(V2_ICON_IDS),
})

export const v2BadgeSubtemaSchema = z.object({
  texto: z.string().min(1).max(60),
  icone: z.enum(V2_ICON_IDS),
})

export const v2CardInferiorSchema = z.object({
  numero: z.string().max(3).optional(),
  titulo: z.string().min(1).max(120),
  bullets: z.array(z.string().max(120)).max(3).default([]),
})

export const v2CardInferiorLongaSchema = z.object({
  textoLongo: z.string().min(1).max(220),
  destaque: z.string().min(1).max(80),
  icone: z.enum(V2_ICON_IDS),
})

export const v2HeroSchema = z
  .object({
    source: z.enum(['ai_generated', 'uploaded']),
    prompt: z.string().max(600).optional(),
    uploadedUrl: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.source === 'ai_generated' && !data.prompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'hero.prompt obrigatório quando source=ai_generated',
        path: ['prompt'],
      })
    }
    if (data.source === 'uploaded' && !data.uploadedUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'hero.uploadedUrl obrigatório quando source=uploaded',
        path: ['uploadedUrl'],
      })
    }
  })

export const v2PlanSchema = z.object({
  templateType: z.enum(V2_TEMPLATE_TYPES),
  variant: z.enum(V2_CAPA_VARIANTS),
  variantReason: z.enum([
    'auto-curta',
    'auto-longa',
    'override-curta',
    'override-longa',
    'cta-final-forced',
  ]),
  titulo: z.string().min(1).max(200),
  bullets: z.array(v2BulletSchema).max(4),
  badgeSubtema: v2BadgeSubtemaSchema.optional(),
  iconeTopo: z.enum(V2_ICON_IDS).optional(),
  cardInferior: v2CardInferiorSchema.optional(),
  cardInferiorLonga: v2CardInferiorLongaSchema.optional(),
  ctaButtonTexto: z.string().max(120).optional(),
  hero: v2HeroSchema,
  charCount: z.object({
    titulo: z.number().int().nonnegative(),
    bulletsTotal: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }),
})

export type V2PlanParsed = z.infer<typeof v2PlanSchema>
