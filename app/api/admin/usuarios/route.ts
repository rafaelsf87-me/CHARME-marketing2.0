import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { hashPassword } from '@/lib/auth/password'
import { z } from 'zod'
import { eq } from 'drizzle-orm'

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'operator']),
})

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }
  return null
}

export async function GET() {
  const err = await requireAdmin()
  if (err) return err

  const list = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)

  return NextResponse.json({ data: list })
}

export async function POST(req: NextRequest) {
  const err = await requireAdmin()
  if (err) return err

  const body = await req.json()
  const parsed = CreateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input inválido', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1)
  if (existing.length > 0) {
    return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })
  }

  const passwordHash = await hashPassword(parsed.data.password)
  await db.insert(users).values({
    email: parsed.data.email,
    name: parsed.data.name,
    role: parsed.data.role,
    passwordHash,
  })

  return NextResponse.json({ ok: true })
}
