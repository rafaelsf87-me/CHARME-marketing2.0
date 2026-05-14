import { z } from 'zod'
import { M1_TEMPLATES } from './templates'

export const M1_MOVEIS = ['sofa', 'cadeira'] as const
export type M1Movel = (typeof M1_MOVEIS)[number]

export const M1_TIPOS_CAPA = ['estampada', 'lisa', 'alto-relevo'] as const
export type M1TipoCapa = (typeof M1_TIPOS_CAPA)[number]

// Todos os 4 tipos agora usam Pipeline A com template + cenário.
// Capa Lisa: subfluxo pula Step 1 (sem ref, prompt com cor).
// Detalhe Tecido: orquestrador roda Pipeline A 2× (close + zoom) e compõe side-by-side.
export const M1_TIPOS_FOTO = ['capa', 'ambiente', 'elastico', 'detalhe-tecido'] as const
export type M1TipoFoto = (typeof M1_TIPOS_FOTO)[number]

const TEMPLATE_IDS = M1_TEMPLATES.map((t) => t.id) as [string, ...string[]]

// Regex hex #RGB ou #RRGGBB (case-insensitive).
const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export const M1RenderSchema = z
  .object({
    movel: z.enum(M1_MOVEIS),
    tipoCapa: z.enum(M1_TIPOS_CAPA),
    tipoFoto: z.enum(M1_TIPOS_FOTO),
    cenarioId: z.enum(TEMPLATE_IDS),
    // Estampada/Alto-relevo: foto-referência da estampa.
    referenciaBlobUrl: z.string().url().optional(),
    // Lisa: cor em hex (substitui foto-referência).
    corHex: z.string().regex(HEX_REGEX, 'Cor deve ser hex #RGB ou #RRGGBB').optional(),
    customization: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    // Capa Lisa: corHex obrigatório, referência opcional/ignorada.
    if (data.tipoCapa === 'lisa') {
      if (!data.corHex) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['corHex'],
          message: 'Cor obrigatória para Capa Lisa',
        })
      }
    } else {
      // Estampada e Alto Relevo: referência obrigatória.
      if (!data.referenciaBlobUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['referenciaBlobUrl'],
          message: 'Foto-referência da estampa obrigatória',
        })
      }
    }
    // Coerência entre template selecionado e móvel/tipoFoto.
    const template = M1_TEMPLATES.find((t) => t.id === data.cenarioId)
    if (template) {
      if (template.movel !== data.movel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cenarioId'],
          message: 'Cenário não corresponde ao móvel selecionado',
        })
      }
      if (template.tipoFoto !== data.tipoFoto) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cenarioId'],
          message: 'Cenário não corresponde ao tipo de foto selecionado',
        })
      }
    }
  })

export type M1RenderInput = z.infer<typeof M1RenderSchema>
