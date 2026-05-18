import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { M1RenderSchema, m1KeywordFallbackSource } from '@/lib/m1/schema'
import { renderM1 } from '@/lib/m1/render'
import { slugifyKeyword } from '@/lib/filename'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Vercel Pro obrigatório. Step 1 (Flux Pro Kontext) + Step 2 (Inpaint) podem
// somar 60–120s; limite Pro é 300s. Mantemos folga.
export const maxDuration = 300

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
      `[M1] render OK em ${tookMs}ms · ${parsed.data.movel}/${parsed.data.tipoFoto}/${parsed.data.tipoCapa}/set${parsed.data.set}`
    )
    const fallbackSource =
      parsed.data.keyword ??
      m1KeywordFallbackSource({
        tipoCapa: parsed.data.tipoCapa,
        corHex: parsed.data.corHex,
        fotoSofa: parsed.data.fotoSofa,
      })
    const normalizedKeyword = slugifyKeyword(fallbackSource)
    const generatedAt = new Date().toISOString()
    return NextResponse.json({ url, tookMs, normalizedKeyword, generatedAt })
  } catch (err) {
    console.error('[M1] render error:', err)
    const msg = err instanceof Error ? err.message : 'Falha ao gerar foto'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
