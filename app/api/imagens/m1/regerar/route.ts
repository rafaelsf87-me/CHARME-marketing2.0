import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { M1RenderSchema } from '@/lib/m1/schema'
import { renderM1 } from '@/lib/m1/render'
import { slugifyKeyword, autoExtractKeyword } from '@/lib/filename'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Mesmo limite do /render — Pipeline A pode levar 60-120s.
export const maxDuration = 300

const RegerarSchema = z.object({
  contextoOriginal: M1RenderSchema,
  ajustePrompt: z
    .string()
    .min(5, 'Descreva o ajuste com pelo menos 5 caracteres')
    .max(300, 'Máximo 300 caracteres'),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = RegerarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input inválido', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { contextoOriginal, ajustePrompt } = parsed.data
  const ajusteLimpo = ajustePrompt.trim()
  const customizationOriginal = contextoOriginal.customization?.trim() || ''
  const customizationFinal = customizationOriginal
    ? `${customizationOriginal}\n\nAdditional adjustments: ${ajusteLimpo}`
    : `Additional adjustments: ${ajusteLimpo}`

  const inputFinal = { ...contextoOriginal, customization: customizationFinal }

  try {
    const startedAt = Date.now()
    const url = await renderM1(inputFinal)
    const tookMs = Date.now() - startedAt
    console.log(
      `[M1] regerar OK em ${tookMs}ms · ${inputFinal.movel}/${inputFinal.tipoFoto}/${inputFinal.tipoCapa}/set${inputFinal.set} · ajuste="${ajusteLimpo.slice(0, 60)}"`
    )
    const normalizedKeyword = inputFinal.keyword
      ? slugifyKeyword(inputFinal.keyword)
      : autoExtractKeyword({
          kind: 'm1',
          tipoCapa: inputFinal.tipoCapa,
          corHex: inputFinal.corHex,
          fotoEstampaUrl: inputFinal.fotoSofa,
        })
    const generatedAt = new Date().toISOString()
    return NextResponse.json({ url, tookMs, normalizedKeyword, generatedAt })
  } catch (err) {
    console.error('[M1] regerar error:', err)
    const msg = err instanceof Error ? err.message : 'Falha ao regerar foto'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
