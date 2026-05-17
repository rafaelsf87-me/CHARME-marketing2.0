import { z } from 'zod'
import { brandM3 } from '@/lib/brand/m3.brand'

// ─── Enums e primitivas ─────────────────────────────────────────────────────

export const M3CondicaoSchema = z.enum([
  '12x-cartao',
  'frete-gratis',
  'cashback',
  'entrega-rapida',
  'entrega-turbinada',
])
export type M3Condicao = z.infer<typeof M3CondicaoSchema>

export const M3TemplateIdSchema = z.enum(['atual-maio26'])

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser hex #RRGGBB')

const M3CoresSchema = z.object({
  primary: hexColor.default(brandM3.defaultColors.primary),
  secondary: hexColor.default(brandM3.defaultColors.secondary),
  accent: hexColor.default(brandM3.defaultColors.accent),
  cardBg: hexColor.default(brandM3.defaultColors.cardBg),
  cardBgEnd: hexColor.default(brandM3.defaultColors.cardBgEnd),
})

const M3TextosSchema = z.object({
  nomePromocao: z
    .string()
    .min(1, 'Nome da promoção é obrigatório')
    .max(60, 'Nome da promoção até 60 caracteres'),
  descontoTexto: z
    .string()
    .min(1, 'Texto do desconto é obrigatório')
    .max(30, 'Texto do desconto até 30 caracteres'),
  naLojaToda: z.boolean().default(true),
})

// ─── Atriz: discriminated union ──────────────────────────────────────────────

const M3AtrizIASchema = z.object({
  modo: z.literal('ia'),
  detalhes: z.string().max(500).optional(),
})

const M3AtrizUploadSchema = z.object({
  modo: z.literal('upload'),
  // Base64 do PNG/JPG enviado pela UI. Decodificado pra Buffer no render.
  uploadBase64: z.string().min(1),
})

const M3AtrizSchema = z.discriminatedUnion('modo', [M3AtrizIASchema, M3AtrizUploadSchema])

// ─── Decorações: discriminated union ─────────────────────────────────────────

const M3DecoracoesBancoSchema = z.object({
  modo: z.literal('banco'),
  ids: z.array(z.string().min(1)).min(1).max(8),
})

const M3DecoracoesIASchema = z.object({
  modo: z.literal('ia'),
  prompts: z.array(z.string().min(1).max(300)).min(1).max(4),
})

const M3DecoracoesSchema = z.discriminatedUnion('modo', [
  M3DecoracoesBancoSchema,
  M3DecoracoesIASchema,
])

// ─── Input principal ─────────────────────────────────────────────────────────

// 4 condições default = top 4 da SPEC (entrega-rapida no lugar de turbinada).
const CONDICOES_DEFAULT: M3Condicao[] = [
  '12x-cartao',
  'frete-gratis',
  'cashback',
  'entrega-rapida',
]

export const M3InputSchema = z.object({
  template: M3TemplateIdSchema.default('atual-maio26'),
  textos: M3TextosSchema,
  cores: M3CoresSchema.default({
    primary: brandM3.defaultColors.primary,
    secondary: brandM3.defaultColors.secondary,
    accent: brandM3.defaultColors.accent,
    cardBg: brandM3.defaultColors.cardBg,
    cardBgEnd: brandM3.defaultColors.cardBgEnd,
  }),
  condicoes: z
    .array(M3CondicaoSchema)
    .min(1, 'Selecione pelo menos 1 condição')
    .max(4, 'Máximo 4 condições por banner')
    .default(CONDICOES_DEFAULT),
  atriz: M3AtrizSchema,
  decoracoes: M3DecoracoesSchema,
})
export type M3Input = z.infer<typeof M3InputSchema>

// ─── Output ──────────────────────────────────────────────────────────────────

export const M3OutputSchema = z.object({
  desktopUrl: z.string().url(),
  mobileUrl: z.string().url(),
  generatedAt: z.string().datetime(),
  custoEstimado: z.number().nonnegative(),
})
export type M3Output = z.infer<typeof M3OutputSchema>

// ─── Schema legado (título isolado) ──────────────────────────────────────────

// Mantido pra compatibilidade com endpoint dedicado `/api/imagens/m3/titulo`
// (a criar na Fase 3). generateTitulo() não depende deste schema.
export const M3TituloInputSchema = z.object({
  texto: z.string().min(1).max(60),
})
export type M3TituloInput = z.infer<typeof M3TituloInputSchema>
