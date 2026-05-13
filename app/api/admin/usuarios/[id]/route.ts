import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth/password'
import { z } from 'zod'
import { eq } from 'drizzle-orm'

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'operator']).optional(),
  password: z.string().min(8, 'Mínimo 8 caracteres').optional(),
})

async function requireAdminAndSelfId() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return { err: NextResponse.json({ error: 'Acesso negado' }, { status: 403 }) }
  }
  return { selfId: session.user.id, err: null as null | NextResponse }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminAndSelfId()
  if (guard.err) return guard.err

  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  const body = await req.json()
  const parsed = UpdateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input inválido', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const patch: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) patch.name = parsed.data.name
  if (parsed.data.role !== undefined) patch.role = parsed.data.role
  if (parsed.data.password) patch.passwordHash = await hashPassword(parsed.data.password)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })
  }

  await db.update(users).set(patch).where(eq(users.id, id))
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdminAndSelfId()
  if (guard.err) return guard.err

  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }
  if (String(id) === guard.selfId) {
    return NextResponse.json({ error: 'Não é possível deletar a si mesmo' }, { status: 400 })
  }

  await db.delete(users).where(eq(users.id, id))
  return NextResponse.json({ ok: true })
}
