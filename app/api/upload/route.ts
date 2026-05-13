import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const MAX_BYTES = 10 * 1024 * 1024 // 10MB

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as HandleUploadBody

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/png', 'image/jpeg'],
        maximumSizeInBytes: MAX_BYTES,
      }),
      onUploadCompleted: async () => {
        // Sem persistência — upload é buffer temporário (Vercel Blob)
      },
    })
    return NextResponse.json(json)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
