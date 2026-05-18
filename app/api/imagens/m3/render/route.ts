import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { M3InputSchema } from '@/lib/m3/schema'
import { renderM3 } from '@/lib/m3/render'
import { slugifyKeyword } from '@/lib/filename'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Pipeline serial pior caso: Flux atriz (~25s) + rembg (~5s) + 2 compose
// (~250ms cada) + 2 uploads Blob (~3s). Folga pra timeout em prod. Vercel
// Pro obrigatório (Hobby cap em 10s).
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = M3InputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input inválido', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const startedAt = Date.now()
    const result = await renderM3(parsed.data)
    const tookMs = Date.now() - startedAt
    console.log(
      `[M3] render OK em ${tookMs}ms · template=${parsed.data.template} · ` +
        `custo=$${result.custoEstimado}`,
    )
    const fallbackKeywordSource = parsed.data.keyword ?? parsed.data.textos.nomePromocao
    const normalizedKeyword = slugifyKeyword(fallbackKeywordSource)
    return NextResponse.json({ ...result, normalizedKeyword })
  } catch (err) {
    console.error('[M3] render error:', err)
    const msg = err instanceof Error ? err.message : 'Falha ao renderizar banner'
    // 502 quando erro vem de upstream IA (FAL/rembg/Blob); 500 pro resto.
    const isUpstream =
      typeof msg === 'string' && /\b(FAL|rembg|flux|gpt-image-1|Blob)\b/i.test(msg)
    return NextResponse.json({ error: msg }, { status: isUpstream ? 502 : 500 })
  }
}
