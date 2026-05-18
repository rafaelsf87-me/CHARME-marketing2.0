import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { regerarSlideInputSchema } from '@/lib/m2/t2/schema'
import { renderSlideRegerar } from '@/lib/m2/t2/render'
import { slugifyKeyword } from '@/lib/filename'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface RegerarRequestBody {
  slideIndex: number
  ajustePrompt: string
  slidePlanOriginal: unknown // SlidePlan único do slide a regerar
  packAssets: unknown
  contextoOriginal: unknown
  normalizedKeyword?: string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as RegerarRequestBody

  // O regerarSlideInputSchema espera slidePlanOriginal já como SlidePlan
  // (não array). UI envia o slide específico.
  const parsed = regerarSlideInputSchema.safeParse({
    slidePlanOriginal: body.slidePlanOriginal,
    slideIndex: body.slideIndex,
    ajustePrompt: body.ajustePrompt,
    packAssets: body.packAssets ?? null,
    contextoOriginal: body.contextoOriginal,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input inválido', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const startedAt = Date.now()
    const { result, pack } = await renderSlideRegerar(parsed.data)
    const tookMs = Date.now() - startedAt

    const normalizedKeyword = slugifyKeyword(
      body.normalizedKeyword ?? parsed.data.contextoOriginal.contextoGeral ?? '',
    )

    console.log(
      `[M2-T2] regerar OK em ${tookMs}ms · slide ${result.slideId} · ajuste="${parsed.data.ajustePrompt.slice(0, 60)}"`,
    )

    return NextResponse.json({
      url: result.url,
      slidePlan: result, // result inclui slideId, slideIndex, url, qc
      slideIndex: result.slideIndex,
      qcReport: result.qc,
      packAssets: pack,
      normalizedKeyword,
      generatedAt: new Date().toISOString(),
      tookMs,
    })
  } catch (err) {
    console.error('[M2-T2] regerar error:', err)
    const msg = err instanceof Error ? err.message : 'Falha ao regerar slide'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
