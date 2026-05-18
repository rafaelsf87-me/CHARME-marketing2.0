import { z } from 'zod'
import { brandM2 } from '@/lib/brand/m2.brand'

export const M2_TEMPLATE_IDS = [
  'atual-maio26',
  'atual-maio26-new',
  'novo-teste-1',
  'pipeline-hibrido-v2',
] as const
export type M2TemplateId = (typeof M2_TEMPLATE_IDS)[number]

// Opções de logo do footer-overlay (Adendo §3.1).
// `casinha` é default (90% dos casos). `retangular` omite handle text — o próprio
// logo já contém "Charme do Detalhe".
export const M2_LOGO_OPTIONS = ['casinha', 'quadrado', '3d', 'retangular'] as const
export type M2LogoOption = (typeof M2_LOGO_OPTIONS)[number]

// Modo de geração (Adendo §3.2). IA = composição livre via gpt-image-1.
// Upload = usuário fornece PNGs + instruções de uso, IA usa como reference image
// pra resolver erros físicos (anatomia, perspectiva).
export const M2_MODO_GERACAO = ['ia', 'upload'] as const
export type M2ModoGeracao = (typeof M2_MODO_GERACAO)[number]

// Imagem única mantém estrutura original (até 8 PNGs + instruções globais).
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
  keyword: z.string().max(40).optional(),
})

// Carrossel: 1 imagem por slide (hotfix UX pós-validação prod, 18/05/2026).
// `pngUrl` substitui `pngUrls[]` — a UX anterior com até 8 PNGs/slide
// confundia (modo IA permitia 3, modo upload permitia 8, semântica dupla).
// `promptImagem` é a instrução de uso da PNG, por-slide (substitui
// `instrucoesUsoImagens` global do carrossel — mais granular).
export const slideSchema = z.object({
  copyTexto: z.string().min(10).max(2000),
  pngUrl: z.string().url().optional(),
  promptImagem: z.string().max(500).optional(),
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
  keyword: z.string().max(40).optional(),
})

// Regras cross-field:
// - Imagem única em modo upload exige ≥1 PNG.
// - Carrossel em modo upload exige 1 PNG em cada slide.
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
      if (!slide.pngUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Modo upload exige 1 imagem por slide',
          path: ['slides', i, 'pngUrl'],
        })
      }
    })
  })

export type M2GenerateInput = z.infer<typeof m2GenerateSchema>
export type M2ImagemUnicaInput = z.infer<typeof imagemUnicaSchema>
export type M2CarrosselInput = z.infer<typeof carrosselSchema>
export type M2SlideInput = z.infer<typeof slideSchema>
