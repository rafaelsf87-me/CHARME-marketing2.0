import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put } from '@vercel/blob'
import { authOptions } from '@/lib/auth/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg'])

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Payload inválido (esperado multipart/form-data)' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Campo "file" ausente ou inválido' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Tipo não suportado (use PNG ou JPG)' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Arquivo excede ${Math.round(MAX_BYTES / 1024 / 1024)}MB` },
      { status: 400 }
    )
  }

  try {
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
    })
    return NextResponse.json({ url: blob.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha no upload'
    console.error('[upload] error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
