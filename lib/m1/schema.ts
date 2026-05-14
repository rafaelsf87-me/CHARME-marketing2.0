import { z } from 'zod'

export const M1_MOVEIS = ['sofa', 'cadeira'] as const
export type M1Movel = (typeof M1_MOVEIS)[number]

export const M1_TIPOS_CAPA = ['estampada', 'lisa', 'alto-relevo'] as const
export type M1TipoCapa = (typeof M1_TIPOS_CAPA)[number]

// Todos os 4 tipos usam Pipeline A com template + cenário (v1.2).
// Capa Lisa: subfluxo pula Step 1 (sem ref, prompt com cor).
// Detalhe Tecido: sofá usa split (compositing close+zoom), cadeira usa simple.
export const M1_TIPOS_FOTO = ['capa', 'ambiente', 'elastico', 'detalhe-tecido'] as const
export type M1TipoFoto = (typeof M1_TIPOS_FOTO)[number]

// Regex hex #RGB ou #RRGGBB (case-insensitive).
const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

// v1.3 — usuário escolhe Set; template é resolvido via getTemplate.
export const M1RenderSchema = z
  .object({
    movel: z.enum(M1_MOVEIS),
    tipoCapa: z.enum(M1_TIPOS_CAPA),
    tipoFoto: z.enum(M1_TIPOS_FOTO),
    set: z.union([z.literal(1), z.literal(2)]),
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
  })

export type M1RenderInput = z.infer<typeof M1RenderSchema>
