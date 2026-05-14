import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { M1RenderSchema } from '@/lib/m1/schema'
import { renderM1 } from '@/lib/m1/render'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Vercel Pro obrigatório: pipeline 2-step pode chegar perto de 60s.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = M1RenderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input inválido', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const startedAt = Date.now()
    const url = await renderM1(parsed.data)
    const tookMs = Date.now() - startedAt
    console.log(
      `[M1] render OK em ${tookMs}ms · ${parsed.data.tipoFoto}/${parsed.data.tipoCapa}`
    )
    return NextResponse.json({ url, tookMs })
  } catch (err) {
    console.error('[M1] render error:', err)
    const msg = err instanceof Error ? err.message : 'Falha ao gerar foto'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
