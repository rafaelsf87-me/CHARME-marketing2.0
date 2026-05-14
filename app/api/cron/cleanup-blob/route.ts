// Política de retenção do Vercel Blob
// - Idade: deleta tudo com mais de 7 dias
// - Prefixos protegidos: "templates/" (assets fixos M1+; ver lib/brand/)
// - Demais paths: outputs descartáveis (M1-M5 + uploads temporários)
// - Schedule: diário, 03h UTC (vercel.json)

import { NextRequest, NextResponse } from 'next/server'
import { list, del } from '@vercel/blob'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  let deleted = 0
  let scanned = 0
  let cursor: string | undefined

  try {
    do {
      const result = await list({ cursor, limit: 1000 })
      cursor = result.cursor
      scanned += result.blobs.length

      for (const blob of result.blobs) {
        if (blob.pathname.startsWith('templates/')) continue

        const blobAge = now - new Date(blob.uploadedAt).getTime()
        if (blobAge > SEVEN_DAYS_MS) {
          await del(blob.url)
          deleted++
        }
      }
    } while (cursor)

    console.log(`[cleanup-blob] Scanned: ${scanned} · Deleted: ${deleted}`)
    return NextResponse.json({ ok: true, scanned, deleted })
  } catch (err) {
    console.error('[cleanup-blob] Erro:', err)
    return NextResponse.json(
      { error: 'Falha na limpeza', message: (err as Error).message },
      { status: 500 }
    )
  }
}
