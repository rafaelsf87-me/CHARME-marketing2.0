import { z } from 'zod'

export const M1_MOVEIS = ['sofa', 'cadeira'] as const
export type M1Movel = (typeof M1_MOVEIS)[number]

export const M1_TIPOS_CAPA = ['estampada', 'lisa', 'alto-relevo'] as const
export type M1TipoCapa = (typeof M1_TIPOS_CAPA)[number]

// Todos os 5 tipos usam Pipeline A com template + cenário (v1.5).
// Capa Lisa: subfluxo pula Step 1 (sem ref, prompt com cor).
// Detalhe Tecido: sofá usa split (compositing close+zoom), cadeira usa simple.
// Vestindo a Capa: apenas sofá; reusa template sofa-capa-1 (mesma geometria);
// prompt adiciona DRESSING ACTION (mão estendendo capa parcialmente aplicada).
export const M1_TIPOS_FOTO = ['capa', 'ambiente', 'elastico', 'detalhe-tecido', 'vestindo-capa'] as const
export type M1TipoFoto = (typeof M1_TIPOS_FOTO)[number]

// Regex hex #RGB ou #RRGGBB (case-insensitive).
const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

// v1.4 — Pipeline A2: foto-sofá (obrigatória) + foto-rolo (opcional/recomendada).
// fotoSofa = sofá-padrão da empresa com a estampa aplicada (define escala física).
// fotoRolo = foto plana do rolo de tecido (clean source de cores/textura).
export const M1RenderSchema = z
  .object({
    movel: z.enum(M1_MOVEIS),
    tipoCapa: z.enum(M1_TIPOS_CAPA),
    tipoFoto: z.enum(M1_TIPOS_FOTO),
    set: z.union([z.literal(1), z.literal(2)]),
    // Estampada/Alto-relevo: foto do sofá-padrão com a estampa (obrigatória).
    fotoSofa: z.string().url().optional(),
    // Estampada/Alto-relevo: foto plana do rolo de tecido (opcional, recomendada).
    fotoRolo: z.string().url().optional(),
    // Lisa: cor em hex (substitui as fotos).
    corHex: z.string().regex(HEX_REGEX, 'Cor deve ser hex #RGB ou #RRGGBB').optional(),
    customization: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    // Vestindo a Capa: apenas sofá (não cadeira).
    if (data.tipoFoto === 'vestindo-capa' && data.movel !== 'sofa') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tipoFoto'],
        message: 'Vestindo a Capa só está disponível para sofá',
      })
    }
    // Capa Lisa: corHex obrigatório, fotos opcionais/ignoradas.
    if (data.tipoCapa === 'lisa') {
      if (!data.corHex) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['corHex'],
          message: 'Cor obrigatória para Capa Lisa',
        })
      }
    } else {
      // Estampada e Alto Relevo: fotoSofa obrigatória; fotoRolo opcional.
      if (!data.fotoSofa) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fotoSofa'],
          message: 'Foto do sofá-padrão com a estampa é obrigatória',
        })
      }
    }
  })

export type M1RenderInput = z.infer<typeof M1RenderSchema>
