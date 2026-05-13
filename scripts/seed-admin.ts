import { db } from '../lib/db/client'
import { users } from '../lib/db/schema'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórios no .env.local')
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing.length > 0) {
    console.log(`Usuário ${email} já existe. Nada a fazer.`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await db.insert(users).values({
    email,
    passwordHash,
    role: 'admin',
    name: 'Rafael Freitas',
  })

  console.log(`Admin ${email} criado com sucesso.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
