import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { verifyPassword } from './password'

function resolveAuthUrl(): string {
  if (process.env.VERCEL_ENV === 'production') {
    return process.env.NEXTAUTH_URL!
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

// NextAuth v4 lê NEXTAUTH_URL de process.env; em previews/dev sobrescrevemos
// com a URL real do deploy pra callbacks/cookies funcionarem.
if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
  process.env.NEXTAUTH_URL = resolveAuthUrl()
}

// trustHost é prop oficial só no NextAuth v5; em v4 é no-op mas mantemos
// pra quando subirmos a versão.
type NextAuthOptionsV5 = NextAuthOptions & { trustHost?: boolean }

export const authOptions: NextAuthOptionsV5 = {
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const found = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1)

        const user = found[0]
        if (!user) return null

        const valid = await verifyPassword(credentials.password, user.passwordHash)
        if (!valid) return null

        return {
          id: String(user.id),
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role
        token.uid = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? ''
        session.user.role = (token.role as string) ?? 'operator'
      }
      return session
    },
  },
}
