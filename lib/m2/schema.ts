import { z } from 'zod'
import { brandM2 } from '@/lib/brand/m2.brand'

export const M2_TEMPLATE_IDS = ['atual-maio26', 'atual-maio26-new', 'novo-teste-1'] as const
export type M2TemplateId = (typeof M2_TEMPLATE_IDS)[number]

// Opções de logo do footer-overlay (Adendo §3.1).
// `casinha` é default (90% dos casos). `retangular` omite handle text — o próprio
// logo já contém "Charme do Detalhe".
export const M2_LOGO_OPTIONS = ['casinha', 'quadrado', '3d', 'retangular'] as const
export type M2LogoOption = (typeof M2_LOGO_OPTIONS)[number]

// Modo de geração (Adendo §3.2). IA = composição livre via gpt-image-1.
// Upload = usuário fornece 1-8 PNGs + instruções de uso por nome/slide, IA usa
// como reference image pra resolver erros físicos (anatomia, perspectiva).
export const M2_MODO_GERACAO = ['ia', 'upload'] as const
export type M2ModoGeracao = (typeof M2_MODO_GERACAO)[number]

const pngUrlsField = z
  .array(z.string().url())
  .max(brandM2.pipeline.maxReferenceImages)
  .optional()

// Schemas-base são ZodObject puros — refinements vão no discriminatedUnion via
// superRefine (z.discriminatedUnion não aceita ZodEffects retornados por refine).
export const imagemUnicaSchema = z.object({
  modo: z.literal('imagem-unica'),
  templateId: z.enum(M2_TEMPLATE_IDS),
  logo: z.enum(M2_LOGO_OPTIONS).default('casinha'),
  modoGeracao: z.enum(M2_MODO_GERACAO).default('ia'),
  copyTexto: z.string().min(10).max(2000),
  instrucoesExtras: z.string().max(500).optional(),
  pngUrls: pngUrlsField,
  instrucoesUsoImagens: z.string().max(800).optional(),
})

export const slideSchema = z.object({
  copyTexto: z.string().min(10).max(2000),
  pngUrls: pngUrlsField,
})

export const carrosselSchema = z.object({
  modo: z.literal('carrossel'),
  templateId: z.enum(M2_TEMPLATE_IDS),
  logo: z.enum(M2_LOGO_OPTIONS).default('casinha'),
  modoGeracao: z.enum(M2_MODO_GERACAO).default('ia'),
  // Tema do carrossel — anexado ao prompt de cada slide.
  contextoGeral: z.string().max(500).optional(),
  slides: z
    .array(slideSchema)
    .min(brandM2.pipeline.carouselSlidesRange.min)
    .max(brandM2.pipeline.carouselSlidesRange.max),
  // Anexado ao copy do último slide com instrução de exibição em destaque.
  ctaFinal: z.string().min(5).max(300),
  // Instruções globais de uso das imagens (modo upload). Referencia por
  // nome de arquivo + número do slide.
  instrucoesUsoImagens: z.string().max(800).optional(),
})

// Regras cross-field (Adendo §3.3 e §3.4):
// - Imagem única em modo upload exige ≥1 PNG.
// - Carrossel em modo upload exige ≥1 PNG em cada slide.
export const m2GenerateSchema = z
  .discriminatedUnion('modo', [imagemUnicaSchema, carrosselSchema])
  .superRefine((data, ctx) => {
    if (data.modoGeracao !== 'upload') return
    if (data.modo === 'imagem-unica') {
      if ((data.pngUrls?.length ?? 0) === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Modo upload exige pelo menos 1 imagem',
          path: ['pngUrls'],
        })
      }
      return
    }
    data.slides.forEach((slide, i) => {
      if ((slide.pngUrls?.length ?? 0) === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Modo upload exige pelo menos 1 imagem por slide',
          path: ['slides', i, 'pngUrls'],
        })
      }
    })
  })

export type M2GenerateInput = z.infer<typeof m2GenerateSchema>
export type M2ImagemUnicaInput = z.infer<typeof imagemUnicaSchema>
export type M2CarrosselInput = z.infer<typeof carrosselSchema>
export type M2SlideInput = z.infer<typeof slideSchema>
