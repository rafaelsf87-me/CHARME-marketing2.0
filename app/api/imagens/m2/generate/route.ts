import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { m2GenerateSchema } from '@/lib/m2/schema'
import { renderM2 } from '@/lib/m2/render'
import { slugifyKeyword } from '@/lib/filename'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Carrossel de 8 slides em paralelo no FAL: latência pior caso ~60s/slide
// → 300s deixa folga. Vercel Pro obrigatório (Hobby cap em 10s).
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = m2GenerateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input inválido', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const startedAt = Date.now()
    const result = await renderM2(parsed.data)
    const tookMs = Date.now() - startedAt
    const qtd = result.urls.length
    console.log(
      `[M2] generate OK em ${tookMs}ms · ${parsed.data.modo} · ${parsed.data.templateId} · ${qtd} img(s)`
    )
    const fallbackKeywordSource =
      parsed.data.keyword ??
      (parsed.data.modo === 'imagem-unica'
        ? parsed.data.copyTexto
        : parsed.data.contextoGeral || parsed.data.slides[0]?.copyTexto)
    const normalizedKeyword = slugifyKeyword(fallbackKeywordSource)
    const generatedAt = new Date().toISOString()
    return NextResponse.json({
      urls: result.urls,
      tookMs,
      normalizedKeyword,
      generatedAt,
    })
  } catch (err) {
    console.error('[M2] generate error:', err)
    const msg = err instanceof Error ? err.message : 'Falha ao gerar'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
