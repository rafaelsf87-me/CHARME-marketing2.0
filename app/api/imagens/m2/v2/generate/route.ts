/**
 * POST /api/imagens/m2/v2/generate
 *
 * V2.0 — Templates fixos (CAPA-CURTA / CAPA-LONGA / CTA-FINAL).
 *
 * Atomicidade: 1 request = 1 PNG. Sem carrossel.
 * Custo médio: ~$0.07 por chamada IA, ~$0.005 por upload.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { v2InputSchema } from '@/lib/m2/v2/schema'
import { renderV2 } from '@/lib/m2/v2/render'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// gpt-image-1 high pode chegar a 60s; LLM planner ~5s; compose ~3s. 120s folga.
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = v2InputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input inválido', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const origin = req.nextUrl.origin
    const result = await renderV2(parsed.data, { origin })
    console.log(
      `[M2-V2] generate OK em ${result.tookMs}ms · ${result.plan.templateType}/${result.plan.variant} · via=${result.via} · qc=${result.qc.pass ? 'pass' : 'fail'} · $${result.costUsd.toFixed(4)}`,
    )
    if (!result.qc.pass) {
      console.warn('[M2-V2] QC issues:', JSON.stringify(result.qc.issues, null, 2))
    }
    return NextResponse.json({
      url: result.url,
      plan: result.plan,
      qc: result.qc,
      via: result.via,
      tookMs: result.tookMs,
      costUsd: result.costUsd,
    })
  } catch (err) {
    console.error('[M2-V2] generate error:', err)
    const msg = err instanceof Error ? err.message : 'Falha ao gerar'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
