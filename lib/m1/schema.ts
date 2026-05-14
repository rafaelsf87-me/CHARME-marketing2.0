import { z } from 'zod'
import { M1_TEMPLATES } from './templates'

export const M1_MOVEIS = ['sofa', 'cadeira'] as const
export type M1Movel = (typeof M1_MOVEIS)[number]

export const M1_TIPOS_CAPA = ['estampada', 'lisa', 'alto-relevo'] as const
export type M1TipoCapa = (typeof M1_TIPOS_CAPA)[number]

export const M1_TIPOS_FOTO = ['capa', 'ambiente', 'elastico', 'detalhe-tecido'] as const
export type M1TipoFoto = (typeof M1_TIPOS_FOTO)[number]

// Tipos que usam Pipeline A (com cenário pré-aprovado)
export const M1_TIPOS_COM_CENARIO: readonly M1TipoFoto[] = ['capa', 'ambiente']

// Tipos que usam Pipeline B (foto bruta + cleanup)
export const M1_TIPOS_SEM_CENARIO: readonly M1TipoFoto[] = ['elastico', 'detalhe-tecido']

const TEMPLATE_IDS = M1_TEMPLATES.map((t) => t.id) as [string, ...string[]]

export const M1RenderSchema = z
  .object({
    movel: z.enum(M1_MOVEIS),
    tipoCapa: z.enum(M1_TIPOS_CAPA),
    tipoFoto: z.enum(M1_TIPOS_FOTO),
    cenarioId: z.enum(TEMPLATE_IDS).optional(),
    referenciaBlobUrl: z.string().url(),
    customization: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (M1_TIPOS_COM_CENARIO.includes(data.tipoFoto) && !data.cenarioId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cenarioId'],
        message: 'Cenário obrigatório para Foto Capa e Foto Ambiente',
      })
    }
    if (M1_TIPOS_SEM_CENARIO.includes(data.tipoFoto) && data.cenarioId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cenarioId'],
        message: 'Foto Elástico e Detalhe do Tecido não usam cenário pré-aprovado',
      })
    }
    if (data.cenarioId) {
      const template = M1_TEMPLATES.find((t) => t.id === data.cenarioId)
      if (template && template.movel !== data.movel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cenarioId'],
          message: 'Cenário não corresponde ao tipo de móvel selecionado',
        })
      }
    }
  })

export type M1RenderInput = z.infer<typeof M1RenderSchema>
