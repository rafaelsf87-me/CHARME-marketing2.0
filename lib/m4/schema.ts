import { z } from 'zod'

export const M4_TEMPLATES = [
  'v1-topo',
  'v2-centro-alto',
  'v3-centro',
  'v4-centro-baixo',
  'v5-rodape',
] as const

export type M4Template = (typeof M4_TEMPLATES)[number]

export const TEMPLATES_3_LINHAS: M4Template[] = ['v2-centro-alto', 'v4-centro-baixo']

export function templateHas3Linhas(t: M4Template): boolean {
  return TEMPLATES_3_LINHAS.includes(t)
}

export const M4RenderSchema = z
  .object({
    template: z.enum(M4_TEMPLATES),
    frameBlobUrl: z.string().url(),
    line1: z.string().min(1, 'Linha 1 obrigatória').max(24),
    line2: z.string().min(1, 'Linha 2 obrigatória').max(22),
    line3: z.string().max(18).optional(),
    iconUrl: z.string().url().optional(),
    customization: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (templateHas3Linhas(data.template)) return !!data.line3 && data.line3.length > 0
      return true
    },
    { message: 'Linha 3 obrigatória para este template', path: ['line3'] }
  )

export type M4RenderInput = z.infer<typeof M4RenderSchema>
