import { z } from 'zod'

// Schema base do M3 — Fase 1 é shell mínimo. Inputs completos (atriz upload,
// decorações, condições, color pickers) entram na Fase 2/3 quando a UI for
// implementada. Por ora, só validamos o input do título isolado.

export const M3CondicaoSchema = z.enum([
  '12x-cartao',
  'frete-gratis',
  'cashback',
  'entrega-rapida',
  'entrega-turbinada',
])
export type M3Condicao = z.infer<typeof M3CondicaoSchema>

export const M3ModoAtrizSchema = z.enum(['ia', 'upload'])
export const M3ModoDecoracoesSchema = z.enum(['banco', 'ia'])

// Shell do M3InputSchema — Fase 1 só usa nomePromo (título). Os outros campos
// ficam opcionais pra não bloquear o desenvolvimento. Tornar obrigatórios
// conforme cada feature entrar (Fase 2/3).
export const M3InputSchema = z.object({
  templateId: z.string().min(1),
  nomePromo: z
    .string()
    .min(1, 'Nome da promoção é obrigatório')
    .max(60, 'Nome da promoção até 60 caracteres'),
  // Tudo abaixo: Fase 2/3.
  descontoPromo: z.string().optional(),
  naLojaToda: z.boolean().optional(),
  cores: z
    .object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
    })
    .optional(),
  condicoes: z.array(M3CondicaoSchema).max(4).optional(),
  modoAtriz: M3ModoAtrizSchema.optional(),
  atrizPromptExtra: z.string().optional(),
  modoDecoracoes: M3ModoDecoracoesSchema.optional(),
  decoracoesIds: z.array(z.string()).optional(),
})
export type M3Input = z.infer<typeof M3InputSchema>

// Schema isolado do título — usado pelo smoke da Fase 1 e pelo endpoint
// `/api/imagens/m3/titulo` (Fase 2).
export const M3TituloInputSchema = z.object({
  texto: z.string().min(1).max(60),
})
export type M3TituloInput = z.infer<typeof M3TituloInputSchema>
