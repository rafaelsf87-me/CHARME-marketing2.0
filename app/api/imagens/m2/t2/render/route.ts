import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { t2InputSchema } from '@/lib/m2/t2/schema'
import { buildSlidePlan } from '@/lib/m2/t2/planner'
import { renderM2T2 } from '@/lib/m2/t2/render'
import { slugifyKeyword } from '@/lib/filename'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Carrossel até 8 slides + IA isolada: gpt-image-1 high ~15-20s por asset.
// Slide 3 do exemplo bucha (2 assets paralelos) cabe em ~35s. 8 slides com IA
// no pior caso ~5-8min — Vercel Pro cap 300s deixa folga pra V1 com cache.
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = t2InputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input inválido', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // Pre-flight: garantir que o Planner consegue construir os SlidePlans
  // (alguns erros — ex: cta-final fallback ausente — falham aqui em vez
  // de na geração FAL, economizando custo).
  let slidePlans
  try {
    slidePlans = buildSlidePlan(parsed.data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Planner falhou'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  try {
    const startedAt = Date.now()
    const output = await renderM2T2(parsed.data)
    const tookMs = Date.now() - startedAt

    const urls = output.results.map((r) => r.url)
    const qcReports = output.results.map((r) => r.qc)
    const hasStructuralError = qcReports.some((qc) =>
      qc.errors.some((e) =>
        ['CANVAS_DIM_WRONG', 'FOOTER_MISSING', 'BLEED_CHECK_FAILED', 'IMAGE_SLOT_EMPTY'].includes(
          e.code,
        ),
      ),
    )

    const fallbackKeywordSource =
      parsed.data.keyword ?? parsed.data.contextoGeral ?? parsed.data.slides[0]?.copyTexto ?? ''
    const normalizedKeyword = slugifyKeyword(fallbackKeywordSource)

    const payload = {
      urls,
      slidePlans,
      packAssets: output.pack,
      qcReports,
      normalizedKeyword,
      generatedAt: new Date().toISOString(),
      tookMs,
    }

    console.log(
      `[M2-T2] render OK em ${tookMs}ms · ${parsed.data.modo} · ${urls.length} slide(s) · keyword=${normalizedKeyword}`,
    )

    if (hasStructuralError) {
      // Entrega 500 com payload completo pra UI mostrar diagnóstico.
      return NextResponse.json(
        { ...payload, error: 'QC estrutural falhou em pelo menos um slide' },
        { status: 500 },
      )
    }

    return NextResponse.json(payload)
  } catch (err) {
    console.error('[M2-T2] render error:', err)
    const msg = err instanceof Error ? err.message : 'Falha ao gerar T2'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
