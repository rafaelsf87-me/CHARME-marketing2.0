import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { M4RenderSchema } from '@/lib/m4/schema'
import { renderM4Thumbnail } from '@/lib/m4/render'
import { slugifyKeyword } from '@/lib/filename'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = M4RenderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input inválido', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const result = await renderM4Thumbnail(parsed.data)
    const fallbackKeyword = parsed.data.keyword ?? parsed.data.line1
    const normalizedKeyword = slugifyKeyword(fallbackKeyword)
    const generatedAt = new Date().toISOString()
    return NextResponse.json({
      url: result.url,
      durationMs: result.durationMs,
      normalizedKeyword,
      generatedAt,
    })
  } catch (err) {
    console.error('[M4] render error:', err)
    const msg = err instanceof Error ? err.message : 'Falha ao gerar thumbnail'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
