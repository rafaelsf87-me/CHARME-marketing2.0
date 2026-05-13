# IMPL_BASE_M4.md
## Documento de Implementação — Base do Sistema + Submódulo M4

**Versão:** 1.0
**Data:** 13/05/2026
**Tipo:** Doc temporário — apagar após implementação concluída
**Destinatário:** Claude Code (Sonnet)

---

## 0. Visão Geral e Escopo

Este documento contém todas as instruções para implementar:

1. **Base do Sistema** (auth, layout, dashboard, admin usuários, brand config, componentes globais)
2. **Submódulo M4 — Thumbnails Feed Instagram** (UI completa + API route stub)

### O que ESTÁ neste doc
- Setup do projeto Next.js
- Database (Vercel Postgres + Drizzle)
- Autenticação (NextAuth + bcrypt)
- Layout shell (sidebar fixa, breadcrumb, container)
- Telas: /login, / (Dashboard), /admin/usuarios, /imagens/m4-thumbnails
- Componentes globais (TooltipInfo, UploadField, TextFieldWithCounter, EmojiPicker3D, etc.)
- API route do M4 com STUB de render
- Picker de emoji 3D com Microsoft Fluent Emoji (CDN)

### O que NÃO está (vem depois)
- **Render real do template M4** (Sharp + Satori com posicionamento pixel-perfect). API retorna stub placeholder. Aguardando "Bloco C — Especificação visual pixel-perfect" do planejamento.
- **Fonte Times New Roman MT** (DEC-003 em `DIVIDAS_PROJETO.md`). Por ora usar `serif` no CSS.
- M1, M2, M3, M5, Template Creator (módulos futuros).

### Antes de começar
Ler nesta ordem:
1. `CLAUDE.md` — contexto e convenções
2. `GUIA_IMPLEMENTACAO.md` — padrões de código/API/render/git
3. `SPEC.md` — especificação funcional (foco nas seções "Autenticação", "Histórico", "Módulo 4")
4. `ARCHITECTURE.md` — stack e estrutura de pastas
5. Este arquivo

### Princípio geral
**Sem over-engineering.** Sistema interno, equipe de 4 pessoas. Código limpo, sem abstrações antecipadas, sem testes E2E. Apenas testes unitários para schemas Zod críticos.

---

## 1. Setup Inicial

### 1.1 Criar o projeto
```bash
pnpm create next-app@latest marketing-ia-charme \
  --typescript --tailwind --eslint --app \
  --src-dir=false --import-alias="@/*"
cd marketing-ia-charme
```

### 1.2 Instalar dependências
```bash
# Auth & DB
pnpm add next-auth@4 @auth/drizzle-adapter bcryptjs
pnpm add drizzle-orm @vercel/postgres
pnpm add -D drizzle-kit @types/bcryptjs

# Forms & validation
pnpm add react-hook-form @hookform/resolvers zod

# UI
pnpm add lucide-react clsx tailwind-merge class-variance-authority
pnpm add geist
pnpm add @radix-ui/react-tooltip @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-slot

# Storage & image (sharp/satori usados depois no render)
pnpm add @vercel/blob
pnpm add sharp satori @resvg/resvg-js

# Tipos node para scripts
pnpm add -D tsx
```

### 1.3 Configurar Shadcn/UI
```bash
pnpm dlx shadcn@latest init
# Style: Default · Base color: Stone · CSS variables: yes
```

Adicionar componentes que serão usados:
```bash
pnpm dlx shadcn@latest add button input label tooltip dialog dropdown-menu form sonner
```

### 1.4 Estrutura de pastas a criar

```
app/
├── layout.tsx                          # Root layout (já gerado pelo create-next-app)
├── globals.css
├── page.tsx                            # Dashboard
├── login/page.tsx                      # Login
├── admin/
│   └── usuarios/page.tsx               # CRUD users (só admin)
├── imagens/
│   ├── layout.tsx                      # Layout com sidebar + breadcrumb
│   └── m4-thumbnails/
│       ├── page.tsx
│       └── _components/
│           ├── template-grid.tsx
│           ├── upload-frame.tsx
│           ├── text-inputs.tsx
│           ├── emoji-picker.tsx
│           ├── customization-field.tsx
│           ├── generate-button.tsx
│           └── preview-area.tsx
└── api/
    ├── auth/[...nextauth]/route.ts
    ├── admin/usuarios/route.ts
    └── imagens/m4/render/route.ts      # STUB por ora

lib/
├── auth/
│   ├── config.ts
│   └── password.ts                     # bcrypt helpers
├── brand/
│   ├── base.config.ts
│   └── m4.brand.ts
├── db/
│   ├── schema.ts
│   └── client.ts
├── m4/
│   ├── templates.ts                    # 5 templates default (JSON)
│   ├── emojis.ts                       # 30 emojis curados (Fluent 3D)
│   └── schema.ts                       # Zod schema do payload
├── storage.ts                          # Vercel Blob helpers
└── utils.ts                            # cn helper

components/
├── ui/                                 # Shadcn auto-gerados
├── layout/
│   ├── app-shell.tsx
│   ├── sidebar.tsx
│   └── breadcrumb.tsx
├── brand-logo.tsx
├── tooltip-info.tsx
├── upload-field.tsx
├── text-field-with-counter.tsx
└── download-button.tsx

public/
└── brand/
    └── logo.svg                        # PLACEHOLDER por ora (casinha simples roxa)

middleware.ts
drizzle.config.ts
.env.example
```

### 1.5 `tsconfig.json` — adicionar strict
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 1.6 `app/globals.css` — Geist + paleta
```css
@import url('https://fonts.cdnfonts.com/css/geist-sans');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brand-primary-dark: #553679;
  --brand-primary-light: #9569C8;
  --brand-cta: #4CDDC3;
  --brand-white: #FEFEFC;
  --app-bg: #FAFAF9;
  --surface: #FFFFFF;
  --border-subtle: rgba(0, 0, 0, 0.06);
  --border-default: rgba(0, 0, 0, 0.1);
  --border-strong: rgba(0, 0, 0, 0.15);
  --text-primary: rgba(0, 0, 0, 0.95);
  --text-secondary: rgba(0, 0, 0, 0.55);
  --text-tertiary: rgba(0, 0, 0, 0.4);
}

html, body {
  background: var(--app-bg);
  color: var(--text-primary);
  font-family: 'Geist Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  font-feature-settings: 'cv11', 'ss01', 'ss03';
  letter-spacing: -0.005em;
}

input, textarea, button {
  font-family: inherit;
}
```

**Importante:** Geist é instalada via npm `geist`, mas pra simplicidade no CSS usamos via CDN fontsource. Em produção, importar do package npm conforme docs do `geist`.

---

## 2. Variáveis de Ambiente

### 2.1 `.env.example`
```env
# Database (Vercel Postgres)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Seed do primeiro admin (usado uma vez)
ADMIN_EMAIL=rafael@charmedodetalhe.com
ADMIN_PASSWORD=trocar-em-producao-cert

# IA — usadas em M1 e M3 (M4 não usa)
FAL_KEY=
OPENAI_API_KEY=
```

Gerar `NEXTAUTH_SECRET` com:
```bash
openssl rand -base64 32
```

### 2.2 Adicionar `.env.local` ao `.gitignore`
Já vem por padrão no create-next-app, mas confirmar.

---

## 3. Brand Config

### 3.1 `lib/brand/base.config.ts`
```typescript
export const brandBase = {
  colors: {
    primaryDark: '#553679',
    primaryLight: '#9569C8',
    cta: '#4CDDC3',
    white: '#FEFEFC',
  },
  logo: '/brand/logo.svg',
  name: 'Charme do Detalhe',
  systemName: 'Marketing IA',
  socialHandle: '@charmedodetalhe',
} as const

export type BrandBase = typeof brandBase
```

### 3.2 `lib/brand/m4.brand.ts`
```typescript
import { brandBase } from './base.config'

export const brandM4 = {
  ...brandBase,
  fonts: {
    // Em produção: 'Times New Roman MT' (DEC-003 pendente).
    // Por ora: fallback serif genérico.
    text: 'serif',
  },
  palette: {
    box1: brandBase.colors.white,        // Linha 1 — branca
    box2: brandBase.colors.primaryDark,  // Linha 2 — roxa
    box3: brandBase.colors.cta,          // Linha 3 — verde
    text1: '#1A1A1A',                    // Texto sobre branca
    text2: brandBase.colors.white,       // Texto sobre roxa
    text3: '#1A1A1A',                    // Texto sobre verde
  },
  dimensions: {
    thumbnail: { width: 1080, height: 1920 },
  },
  rotation: -2.5, // graus
  limits: {
    line1MaxChars: 24,
    line2MaxChars: 22,
    line3MaxChars: 18,
  },
} as const

export type BrandM4 = typeof brandM4
```

### 3.3 `public/brand/logo.svg` (placeholder)
Criar um SVG simples temporário de uma "casinha" 32×32 em `#553679`. Pode ser:
```svg
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 4 L4 14 L7 14 L7 26 L13 26 L13 19 L19 19 L19 26 L25 26 L25 14 L28 14 Z" fill="#553679"/>
</svg>
```
Rafael fornecerá o SVG definitivo depois — substituir esse arquivo.

---

## 4. Database (Vercel Postgres + Drizzle)

### 4.1 `lib/db/schema.ts`
```typescript
import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
  role: varchar('role', { length: 20 }).notNull().default('operator'), // 'admin' | 'operator'
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

### 4.2 `lib/db/client.ts`
```typescript
import { drizzle } from 'drizzle-orm/vercel-postgres'
import { sql } from '@vercel/postgres'
import * as schema from './schema'

export const db = drizzle(sql, { schema })
```

### 4.3 `drizzle.config.ts` (raiz do projeto)
```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
} satisfies Config
```

### 4.4 Adicionar scripts ao `package.json`
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit migrate",
    "seed:admin": "tsx scripts/seed-admin.ts"
  }
}
```

### 4.5 `scripts/seed-admin.ts`
```typescript
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
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

main().catch(console.error)
```

### 4.6 Rodar setup
```bash
pnpm db:push     # cria a tabela users no Postgres
pnpm seed:admin  # cria o primeiro admin
```

---

## 5. Autenticação (NextAuth)

### 5.1 `lib/auth/password.ts`
```typescript
import bcrypt from 'bcryptjs'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
```

### 5.2 `lib/auth/config.ts`
```typescript
import CredentialsProvider from 'next-auth/providers/credentials'
import type { NextAuthOptions } from 'next-auth'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { verifyPassword } from './password'

export const authOptions: NextAuthOptions = {
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
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 dias
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role
      return token
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = token.role
      return session
    },
  },
}
```

### 5.3 `app/api/auth/[...nextauth]/route.ts`
```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### 5.4 `types/next-auth.d.ts`
```typescript
import 'next-auth'

declare module 'next-auth' {
  interface User {
    role: string
  }
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      role: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
  }
}
```

### 5.5 `middleware.ts` (raiz)
```typescript
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = req.nextauth.token?.role

    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/((?!login|api/auth|_next|favicon|brand).*)'],
}
```

---

## 6. Layout Shell

### 6.1 `components/layout/app-shell.tsx`
Server Component que envelopa sidebar + main.

```tsx
import { Sidebar } from './sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>{children}</main>
    </div>
  )
}
```

### 6.2 `components/layout/sidebar.tsx`
Client Component (precisa do `usePathname` para destacar item ativo).

**Estrutura:**
- Width: **260px** fixa
- Background: `#FFFFFF`
- Border-right: `0.5px solid var(--border-subtle)`
- Top: logo casinha + "Marketing IA" + "Charme do Detalhe"
- Seção "Geral": Home
- Seção "Módulos": Geração de Imagens (expansível) → M1, M2, M3, M4, M5, Template Creator
- Bottom: Avatar (iniciais do nome no fundo `#EEEDFE` com texto `#553679`), nome, role, botão logout

**Comportamento:**
- Submódulos sempre visíveis quando dentro de `/imagens/*`
- Item ativo: **font-weight: 500** (negrito), cor normal (sem destaque colorido)
- Hover nos items: `background: rgba(0,0,0,0.04)`

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { brandBase } from '@/lib/brand/base.config'
import { Home, Image, ChevronDown, LogOut } from 'lucide-react'

const submodules = [
  { href: '/imagens/m1-vitrine', label: 'M1 · Vitrine' },
  { href: '/imagens/m2-posts', label: 'M2 · Posts' },
  { href: '/imagens/m3-banners', label: 'M3 · Banners' },
  { href: '/imagens/m4-thumbnails', label: 'M4 · Thumbnails' },
  { href: '/imagens/m5-email', label: 'M5 · Email' },
  { href: '/imagens/template-creator', label: 'Template Creator' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userName = session?.user?.name || session?.user?.email || 'Usuário'
  const initials = userName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  const role = session?.user?.role === 'admin' ? 'Admin' : 'Operador'

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside style={{
      width: 260, background: '#FFFFFF',
      borderRight: '0.5px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column'
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px 20px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 32, height: 32, background: brandBase.colors.primaryDark, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Home size={17} color="white" />
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{brandBase.systemName}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 3 }}>{brandBase.name}</div>
        </div>
      </div>

      <div style={{ height: '0.5px', background: 'var(--border-subtle)', margin: '0 16px 12px' }} />

      <nav style={{ flex: 1, padding: '0 10px', overflowY: 'auto' }}>
        <SectionLabel>Geral</SectionLabel>
        <NavLink href="/" icon={<Home size={17} />} active={isActive('/') && pathname === '/'}>Home</NavLink>

        <SectionLabel>Módulos</SectionLabel>
        <NavLink href="/imagens" icon={<Image size={17} />} active={pathname.startsWith('/imagens')}>
          Geração de Imagens
          <ChevronDown size={13} style={{ marginLeft: 'auto', opacity: 0.4 }} />
        </NavLink>

        {pathname.startsWith('/imagens') && (
          <div style={{ padding: '4px 0 4px 28px' }}>
            {submodules.map(m => (
              <SubNavLink key={m.href} href={m.href} active={isActive(m.href)}>
                {m.label}
              </SubNavLink>
            ))}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div style={{ padding: '14px 16px', borderTop: '0.5px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 500, color: brandBase.colors.primaryDark }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{userName}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2 }}>{role}</div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          aria-label="Sair"
          style={{ padding: '7px 9px', background: 'transparent', border: '0.5px solid var(--border-default)', borderRadius: 6, cursor: 'pointer' }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', padding: '14px 12px 6px' }}>{children}</div>
}

function NavLink({ href, icon, active, children }: { href: string; icon: React.ReactNode; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 7,
      fontSize: 13, color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      fontWeight: active ? 500 : 400, textDecoration: 'none', transition: 'background 0.12s'
    }}>
      {icon}{children}
    </Link>
  )
}

function SubNavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      display: 'block', padding: '7px 12px', borderRadius: 6,
      fontSize: 12.5, color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      fontWeight: active ? 500 : 400, textDecoration: 'none'
    }}>
      {children}
    </Link>
  )
}
```

**Importante:** `Geração de Imagens` no sidebar é só um label expansível — **não navega para `/imagens`** (essa rota não existe; só expande/recolhe). O `href="/imagens"` aqui é para o `usePathname` matchar — substituir por um botão `<button>` com toggle local se preferir mais limpo. Decisão técnica fica a critério.

### 6.3 `components/layout/breadcrumb.tsx`
Server Component recebe path e label, renderiza:
```tsx
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type Crumb = { label: string; href?: string }

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
      {items.map((c, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {c.href && !isLast ? (
              <Link href={c.href} style={{ color: 'inherit', textDecoration: 'none' }}>{c.label}</Link>
            ) : (
              <span style={{ color: isLast ? 'var(--text-primary)' : 'inherit', fontWeight: isLast ? 500 : 400 }}>{c.label}</span>
            )}
            {!isLast && <ChevronRight size={12} />}
          </span>
        )
      })}
    </div>
  )
}
```

### 6.4 `app/imagens/layout.tsx`
```tsx
import { AppShell } from '@/components/layout/app-shell'

export default function ImagensLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
```

Aplicar `AppShell` também em `app/page.tsx` e `app/admin/usuarios/page.tsx`.

---

## 7. Tela /login

### 7.1 Comportamento
- Layout: tela cheia centralizada, fundo `#FAFAF9`
- Logo casinha + "Marketing IA" no canto superior esquerdo
- Card central max-width 360px
- Eyebrow "Charme do Detalhe" → h1 "Entre na sua conta" → subcopy
- Campos: E-mail, Senha
- Botão "Entrar" full-width em `#553679`, hover `#46295F`
- Erro de login: mensagem inline acima do botão em vermelho sutil `#A32D2D`
- Após sucesso: redirect para `/`

### 7.2 Implementação completa
```tsx
'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})
type LoginInput = z.infer<typeof LoginSchema>

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/'
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setServerError(null)
    setLoading(true)
    const res = await signIn('credentials', { ...data, redirect: false, callbackUrl })
    setLoading(false)
    if (!res || res.error) {
      setServerError('E-mail ou senha incorretos.')
      return
    }
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 24 }}>
      <div style={{ position: 'absolute', top: 28, left: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, background: '#553679', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 500 }}>M</div>
        <div style={{ fontSize: 12.5, fontWeight: 500 }}>Marketing IA</div>
      </div>

      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 14 }}>Charme do Detalhe</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 500, letterSpacing: '-0.025em' }}>Entre na sua conta</h1>
          <p style={{ margin: '8px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>Acesse o painel de criação de conteúdo</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>E-mail</label>
            <input {...register('email')} type="email" placeholder="rafael@charmedodetalhe.com" style={inputStyle} />
            {errors.email && <div style={errorStyle}>{errors.email.message}</div>}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Senha</label>
            <input {...register('password')} type="password" placeholder="••••••••" style={inputStyle} />
            {errors.password && <div style={errorStyle}>{errors.password.message}</div>}
          </div>

          {serverError && <div style={{ ...errorStyle, marginTop: 4 }}>{serverError}</div>}

          <button type="submit" disabled={loading} style={{
            marginTop: 8, padding: '12px 16px', background: loading ? '#7A6195' : '#553679',
            color: 'white', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 500, cursor: loading ? 'wait' : 'pointer'
          }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 28, fontSize: 11.5, color: 'var(--text-tertiary)' }}>
          Esqueceu a senha? Solicite ao admin uma nova conta.
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: 'rgba(0,0,0,0.35)' }}>
        Charme do Detalhe · Marketing IA 2.0
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', border: '0.5px solid var(--border-strong)',
  borderRadius: 8, fontSize: 13.5, background: '#FFFFFF', outline: 'none', boxSizing: 'border-box',
}
const errorStyle: React.CSSProperties = {
  marginTop: 6, fontSize: 11.5, color: '#A32D2D',
}
```

---

## 8. Tela / (Dashboard)

### 8.1 Comportamento
- Saudação fixa: **"Bora Criar!!!"** (com 3 exclamações)
- Subcopy: "Selecione um módulo para começar a trabalhar."
- 1 card ativo: Geração de Imagens (clicável, navega para `/imagens/m4-thumbnails` — primeiro submódulo ativo; ou desabilita até existir Index)
- 3 cards placeholder: Geração de Copy, Análise de Ads, Geração de Ideias (não clicáveis, badge "Em breve")

### 8.2 Implementação
```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import Link from 'next/link'
import { Image, FileText, BarChart, Lightbulb, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <AppShell>
      <div style={{ padding: '40px 44px' }}>
        <div style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 12 }}>Dashboard</div>

        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>Bora Criar!!!</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 32px', maxWidth: 380 }}>
          Selecione um módulo para começar a trabalhar.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, maxWidth: 720 }}>
          <ModuleCard
            href="/imagens/m4-thumbnails"
            icon={<Image size={21} color="white" />}
            iconBg="#553679"
            title="Geração de Imagens"
            badge="5 submódulos"
            description="Fotos de produto, posts, banners, thumbnails e emails"
            active
          />
          <ModuleCard icon={<FileText size={21} color="rgba(0,0,0,0.35)" />} title="Geração de Copy" description="Textos para ads, descrições de produto, emails" badge="Em breve" />
          <ModuleCard icon={<BarChart size={21} color="rgba(0,0,0,0.35)" />} title="Análise de Ads" description="Métricas, insights e otimização de campanhas" badge="Em breve" />
          <ModuleCard icon={<Lightbulb size={21} color="rgba(0,0,0,0.35)" />} title="Geração de Ideias" description="Brainstorming assistido para campanhas e conteúdo" badge="Em breve" />
        </div>
      </div>
    </AppShell>
  )
}

function ModuleCard({ href, icon, iconBg, title, badge, description, active }: any) {
  const inner = (
    <div style={{
      background: active ? '#FFFFFF' : '#FAFAF9',
      border: '0.5px solid var(--border-subtle)',
      borderRadius: 12, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 18,
      cursor: active ? 'pointer' : 'default'
    }}>
      <div style={{ width: 42, height: 42, background: iconBg || '#F4F4F2', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ fontWeight: 500, fontSize: 14.5, color: active ? 'inherit' : 'var(--text-secondary)' }}>{title}</div>
          <div style={{ fontSize: 10.5, padding: '2px 7px', background: active ? '#EEEDFE' : '#F4F4F2', color: active ? '#553679' : 'var(--text-secondary)', borderRadius: 4, fontWeight: 500 }}>{badge}</div>
        </div>
        <div style={{ fontSize: 12.5, color: active ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>{description}</div>
      </div>
      {active && <ArrowRight size={17} color="rgba(0,0,0,0.35)" />}
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link> : inner
}
```

---

## 9. Tela /admin/usuarios

### 9.1 Comportamento
- Proteção: redireciona para `/` se role !== 'admin' (já no middleware)
- Lista de usuários em tabela: Nome · E-mail · Role · Criado em · Ações
- Botão "Novo usuário" → abre Dialog com form (Nome, E-mail, Senha inicial, Role)
- Cada linha tem: Editar (Dialog) · Deletar (confirmação)
- Não permitir deletar o próprio usuário logado
- Layout dentro do AppShell

### 9.2 API Routes — `app/api/admin/usuarios/route.ts`
```typescript
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

  const list = await db.select({
    id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt,
  }).from(users)
  return NextResponse.json({ data: list })
}

export async function POST(req: NextRequest) {
  const err = await requireAdmin()
  if (err) return err

  const body = await req.json()
  const parsed = CreateUserSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Input inválido', details: parsed.error.flatten() }, { status: 400 })

  const existing = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1)
  if (existing.length > 0) return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 409 })

  const passwordHash = await hashPassword(parsed.data.password)
  await db.insert(users).values({ email: parsed.data.email, name: parsed.data.name, role: parsed.data.role, passwordHash })

  return NextResponse.json({ ok: true })
}
```

Criar também `DELETE` e `PATCH` em `app/api/admin/usuarios/[id]/route.ts` seguindo o mesmo padrão. Proteger contra deletar self.

### 9.3 Tela (esqueleto)
Tabela simples com Shadcn UI. Pode usar `<table>` HTML puro com estilo Tailwind, sem precisar de DataTable complexo.

---

## 10. Submódulo M4 — /imagens/m4-thumbnails

### 10.1 Schema do payload — `lib/m4/schema.ts`
```typescript
import { z } from 'zod'

export const M4_TEMPLATES = ['v1-topo', 'v2-centro-alto', 'v3-centro', 'v4-centro-baixo', 'v5-rodape'] as const
export type M4Template = typeof M4_TEMPLATES[number]

export const TEMPLATES_3_LINHAS: M4Template[] = ['v2-centro-alto', 'v4-centro-baixo']

export function templateHas3Linhas(t: M4Template): boolean {
  return TEMPLATES_3_LINHAS.includes(t)
}

export const M4RenderSchema = z.object({
  template: z.enum(M4_TEMPLATES),
  frameBlobUrl: z.string().url(),
  line1: z.string().min(1, 'Linha 1 obrigatória').max(24),
  line2: z.string().min(1, 'Linha 2 obrigatória').max(22),
  line3: z.string().max(18).optional(),
  iconUrl: z.string().url().optional(), // emoji 3D ou PNG upload
  customization: z.string().max(500).optional(),
}).refine((data) => {
  if (templateHas3Linhas(data.template)) return !!data.line3 && data.line3.length > 0
  return true
}, { message: 'Linha 3 obrigatória para este template', path: ['line3'] })

export type M4RenderInput = z.infer<typeof M4RenderSchema>
```

### 10.2 Templates default — `lib/m4/templates.ts`
```typescript
export type M4TemplateDef = {
  id: 'v1-topo' | 'v2-centro-alto' | 'v3-centro' | 'v4-centro-baixo' | 'v5-rodape'
  name: string
  description: string
  lines: 2 | 3
  // Posição vertical em % da altura (centro do bloco)
  verticalAnchorPercent: number
}

export const M4_TEMPLATE_DEFS: M4TemplateDef[] = [
  { id: 'v1-topo',         name: 'Topo',         description: 'Bloco no terço superior',   lines: 2, verticalAnchorPercent: 22 },
  { id: 'v2-centro-alto',  name: 'Centro-alto',  description: 'Acima do meio',             lines: 3, verticalAnchorPercent: 38 },
  { id: 'v3-centro',       name: 'Centro',       description: 'Meio exato',                lines: 2, verticalAnchorPercent: 50 },
  { id: 'v4-centro-baixo', name: 'Centro-baixo', description: 'Abaixo do meio',            lines: 3, verticalAnchorPercent: 62 },
  { id: 'v5-rodape',       name: 'Rodapé',       description: 'Bloco no terço inferior',   lines: 2, verticalAnchorPercent: 78 },
]
```

### 10.3 Curadoria de emojis 3D — `lib/m4/emojis.ts`
30 emojis curados do Microsoft Fluent Emoji 3D, agrupados por categoria. URL base do CDN:

```typescript
export type Emoji3D = {
  id: string
  label: string
  category: 'urgencia' | 'casa' | 'emocoes' | 'destaque' | 'decorativo' | 'acao'
  url: string
}

const BASE = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets'

function build(folder: string, file: string): string {
  return `${BASE}/${encodeURIComponent(folder)}/3D/${file}_3d.png`
}

export const CURATED_EMOJIS_3D: Emoji3D[] = [
  // Urgência / Tempo
  { id: 'stopwatch',       label: 'Cronômetro',   category: 'urgencia',   url: build('Stopwatch', 'stopwatch') },
  { id: 'alarm-clock',     label: 'Despertador',  category: 'urgencia',   url: build('Alarm clock', 'alarm_clock') },
  { id: 'fire',            label: 'Fogo',         category: 'urgencia',   url: build('Fire', 'fire') },
  { id: 'warning',         label: 'Atenção',      category: 'urgencia',   url: build('Warning', 'warning') },

  // Casa / Limpeza
  { id: 'soap',            label: 'Sabonete',     category: 'casa',       url: build('Soap', 'soap') },
  { id: 'broom',           label: 'Vassoura',     category: 'casa',       url: build('Broom', 'broom') },
  { id: 'sparkles',        label: 'Brilho',       category: 'casa',       url: build('Sparkles', 'sparkles') },
  { id: 'droplet',         label: 'Gota',         category: 'casa',       url: build('Droplet', 'droplet') },
  { id: 'house',           label: 'Casa',         category: 'casa',       url: build('House', 'house') },

  // Emoções
  { id: 'weary-face',      label: 'Cansado',      category: 'emocoes',    url: build('Weary face', 'weary_face') },
  { id: 'star-struck',     label: 'Encantado',    category: 'emocoes',    url: build('Star-struck', 'star-struck') },
  { id: 'smiling-hearts',  label: 'Apaixonado',   category: 'emocoes',    url: build('Smiling face with hearts', 'smiling_face_with_hearts') },
  { id: 'open-mouth',      label: 'Surpreso',     category: 'emocoes',    url: build('Face with open mouth', 'face_with_open_mouth') },
  { id: 'thinking',        label: 'Pensativo',    category: 'emocoes',    url: build('Thinking face', 'thinking_face') },

  // Destaque
  { id: 'hundred',         label: 'Cem',          category: 'destaque',   url: build('Hundred points', 'hundred_points') },
  { id: 'star',            label: 'Estrela',      category: 'destaque',   url: build('Star', 'star') },
  { id: 'light-bulb',      label: 'Lâmpada',      category: 'destaque',   url: build('Light bulb', 'light_bulb') },
  { id: 'bullseye',        label: 'Alvo',         category: 'destaque',   url: build('Bullseye', 'bullseye') },
  { id: 'eyes',            label: 'Olhos',        category: 'destaque',   url: build('Eyes', 'eyes') },

  // Decorativo
  { id: 'cherry-blossom',  label: 'Cerejeira',    category: 'decorativo', url: build('Cherry blossom', 'cherry_blossom') },
  { id: 'tulip',           label: 'Tulipa',       category: 'decorativo', url: build('Tulip', 'tulip') },
  { id: 'herb',            label: 'Folha',        category: 'decorativo', url: build('Herb', 'herb') },
  { id: 'butterfly',       label: 'Borboleta',    category: 'decorativo', url: build('Butterfly', 'butterfly') },
  { id: 'sparkling-heart', label: 'Coração',      category: 'decorativo', url: build('Sparkling heart', 'sparkling_heart') },

  // Ação
  { id: 'check-mark',      label: 'Confere',      category: 'acao',       url: build('Check mark', 'check_mark') },
  { id: 'cross-mark',      label: 'Errado',       category: 'acao',       url: build('Cross mark', 'cross_mark') },
  { id: 'point-right',     label: 'Aponta',       category: 'acao',       url: build('Backhand index pointing right', 'backhand_index_pointing_right') },
  { id: 'flexed-bicep',    label: 'Força',        category: 'acao',       url: build('Flexed biceps', 'flexed_biceps') },
  { id: 'raising-hands',   label: 'Comemora',     category: 'acao',       url: build('Raising hands', 'raising_hands') },
  { id: 'party-popper',    label: 'Festa',        category: 'acao',       url: build('Party popper', 'party_popper') },
]
```

**Atenção:** alguns nomes podem ter variação entre Light/Dark/Default no Fluent. Se uma URL der 404, ajustar para versão "Default" (sem subpasta de skin tone). Padrão geral: `assets/{Nome}/3D/{nome_underscore}_3d.png`.

### 10.4 Página `app/imagens/m4-thumbnails/page.tsx`
Estrutura conforme mockup final aprovado:

```tsx
import { AppShell } from '@/components/layout/app-shell'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { M4Form } from './_components/m4-form'

export default function M4Page() {
  return (
    <AppShell>
      <div style={{ padding: '36px 40px 40px', maxWidth: 920 }}>
        <Breadcrumb items={[
          { label: 'Geração de Imagens' },
          { label: 'M4 · Thumbnails' },
        ]} />

        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 500, letterSpacing: '-0.025em' }}>
          Thumbnails Feed Instagram
        </h1>
        <p style={{ margin: '0 0 32px', fontSize: 13.5, color: 'var(--text-secondary)', maxWidth: 460 }}>
          Inclua caixas de texto sobre uma imagem.
        </p>

        <M4Form />
      </div>
    </AppShell>
  )
}
```

### 10.5 `_components/m4-form.tsx`
Client Component que orquestra todo o form com `react-hook-form` + `zod`. Implementar:

- `useForm` com `M4RenderSchema` (versão client com superRefine condicional)
- Estado: template selecionado, frame uploaded (blob URL), iconUrl
- Subcomponentes:
  - `<TemplateGrid />` (5 cards, controla seleção)
  - `<UploadFrame />` (drag/drop, upload pro Vercel Blob, salva URL no form)
  - `<TextInputs />` (linha 1, 2, e condicionalmente linha 3)
  - `<EmojiPicker3D />` (lista curada + botão "Mais" + botão "PNG próprio")
  - `<CustomizationField />` (textarea opcional)
  - `<GenerateButton />` (disabled enquanto inválido)
  - `<PreviewArea />` (placeholder antes de gerar, imagem + download depois)

**Comportamento crítico:**
- Quando template muda para v2/v4 → mostrar linha 3 com fade in
- Quando template muda para v1/v3/v5 → esconder linha 3 com fade out, limpar valor
- Contador de chars atualiza em tempo real, fica vermelho ao atingir limite
- Botão "Gerar" desabilitado se: template não selecionado OU frame não enviado OU linha 1 vazia OU linha 2 vazia OU (template é 3 linhas E linha 3 vazia)

### 10.6 `_components/emoji-picker.tsx`
Implementação inline (sem modal complexo):

- Linha horizontal com os 6 emojis mais usados (categorias mistas)
- Botão "Mais" → abre Dialog (Shadcn) com grid completo dos 30 emojis, agrupados por categoria, com busca
- Botão "PNG próprio" → input file, valida tipo (PNG) e tamanho (max 200KB), upload pro Vercel Blob, salva URL como `iconUrl`
- Selecionado: borda 1.5px roxa `#553679`, demais: 0.5px cinza

### 10.7 API route — `app/api/imagens/m4/render/route.ts` (STUB)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { M4RenderSchema } from '@/lib/m4/schema'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = M4RenderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Input inválido', details: parsed.error.flatten() }, { status: 400 })
  }

  // TODO(Bloco-C): substituir stub pelo render real com Sharp + Satori
  // - usar parsed.data.frameBlobUrl como background
  // - aplicar template parsed.data.template (posição vertical)
  // - desenhar caixa branca (linha 1), roxa (linha 2), verde (linha 3 se houver)
  // - aplicar rotação -2.5° no bloco inteiro
  // - desenhar SVG da florzinha no canto sup direito da linha 1
  // - adicionar emoji 3D (parsed.data.iconUrl) no final da última caixa
  // - exportar PNG 1080x1920
  // - fazer upload pro Vercel Blob
  // - retornar URL pública

  // STUB temporário: retorna o próprio frame enviado
  return NextResponse.json({
    url: parsed.data.frameBlobUrl,
    stub: true,
    message: 'Render real será implementado no Bloco C',
  })
}
```

### 10.8 Upload do frame — usar Vercel Blob via client upload
Doc oficial: https://vercel.com/docs/storage/vercel-blob/client-upload

Criar `app/api/upload/route.ts` (genérico, reutilizável):
```typescript
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

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
        maximumSizeInBytes: 10 * 1024 * 1024, // 10MB
      }),
      onUploadCompleted: async () => {},
    })
    return NextResponse.json(json)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
```

No client, usar `upload()` do `@vercel/blob/client` apontando para `/api/upload`.

---

## 11. Componentes Globais

Criar componentes reutilizáveis em `components/`:

### 11.1 `tooltip-info.tsx`
```tsx
'use client'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'

export function TooltipInfo({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle size={13} style={{ color: 'var(--text-tertiary)', cursor: 'help' }} />
        </TooltipTrigger>
        <TooltipContent style={{ maxWidth: 280, fontSize: 12 }}>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

### 11.2 `text-field-with-counter.tsx`
Input de texto com:
- Label
- Bolinha de cor (prop `colorIndicator`)
- TooltipInfo (prop `tooltipText`)
- Contador X/N (right aligned, tabular-nums)
- Cor do contador vermelha ao atingir limite

### 11.3 `upload-field.tsx`
Drop zone com:
- Ícone upload
- Texto principal "Arraste a imagem ou clique para enviar"
- Texto secundário (prop `hint`, ex: "PNG ou JPG · proporção 9:16")
- Estados: vazio / arrastando / uploading / uploaded (mostra preview)
- Botão "Remover" no estado uploaded

### 11.4 `download-button.tsx`
Botão outline roxo com texto "Fazer Download" + ícone download (Lucide). Recebe `url` como prop, abre em nova aba ou força download.

---

## 12. Tooltips do M4 — Conteúdo Exato

Aplicar nos campos da tela `/imagens/m4-thumbnails`:

| Campo | Texto do tooltip |
|---|---|
| Escolha o template | *"Escolha onde o bloco de texto vai aparecer no thumbnail. Templates com 3 linhas habilitam a linha 3 abaixo."* |
| Envie o frame do vídeo | *"Print/screenshot do vídeo que será o fundo do thumbnail. Use proporção vertical 9:16. PNG ou JPG, até 10MB."* |
| Linha 1 — caixa branca | *"Texto principal, exibido em caixa branca com letras escuras. Será exibido exatamente como digitado. Máx 24 caracteres."* |
| Linha 2 — caixa roxa | *"Texto secundário, exibido em caixa roxa com letras brancas. Será exibido exatamente como digitado. Máx 22 caracteres."* |
| Linha 3 — caixa verde | *"Terceiro texto (só nos templates Centro-alto e Centro-baixo), exibido em caixa verde com letras escuras. Máx 18 caracteres."* |
| Ícone final | *"Emoji 3D que aparece ao final da última linha de texto. Escolha um da lista ou envie um PNG próprio (até 200KB, fundo transparente)."* |
| Customização | *"Ajustes de tratamento da imagem. Ex: 'aumentar brilho', 'mais contraste'. Aplicado no frame antes do compositing."* |

---

## 13. STUBs e TODOs Explícitos

Marcar todos os pontos do Bloco C com:
```typescript
// TODO(Bloco-C): <descrição>
```

Lista esperada de TODOs:
- `lib/brand/m4.brand.ts` — fonte `serif` → substituir por Times New Roman MT (depende de DEC-003)
- `app/api/imagens/m4/render/route.ts` — implementar render real com Sharp + Satori
- `_components/preview-area.tsx` — receber URL do render real (já preparado pra exibir img)
- Florzinha SVG — armazenar em `public/brand/florzinha.svg`, mas só usar no render do Bloco C

---

## 14. Como Rodar

```bash
# 1. Instalar
pnpm install

# 2. Configurar Vercel
vercel link            # conecta ao projeto Vercel
vercel env pull        # baixa env vars do dashboard

# 3. Setup DB
pnpm db:push           # cria schema no Postgres
pnpm seed:admin        # cria primeiro admin

# 4. Rodar
pnpm dev               # localhost:3000
```

---

## 15. Checklist Final de Implementação

Ao terminar, validar:

### Funcional
- [ ] Login com admin criado via seed funciona
- [ ] Após login, redireciona para `/` (Dashboard)
- [ ] Dashboard mostra "Bora Criar!!!" + 4 cards (1 ativo, 3 "Em breve")
- [ ] Clicar no card "Geração de Imagens" navega para `/imagens/m4-thumbnails`
- [ ] Sidebar fixa à esquerda, com seções "Geral" e "Módulos"
- [ ] Submódulos de "Geração de Imagens" sempre visíveis quando navegando em `/imagens/*`
- [ ] Item ativo no sidebar fica em negrito
- [ ] Logout funciona e volta pra `/login`
- [ ] Acesso a `/admin/usuarios` redireciona pra `/` se usuário não é admin
- [ ] Admin consegue criar, editar e deletar usuários (não pode deletar a si mesmo)
- [ ] Senha é hash com bcrypt antes de salvar

### M4 — `/imagens/m4-thumbnails`
- [ ] 5 cards de template aparecem em linha horizontal
- [ ] Selecionar V2 ou V4 mostra a linha 3
- [ ] Selecionar V1, V3 ou V5 esconde a linha 3
- [ ] Contadores X/24, X/22, X/18 funcionam
- [ ] Contador fica vermelho ao atingir limite
- [ ] Upload do frame funciona (Vercel Blob)
- [ ] Picker de emoji 3D mostra 6 atalhos + botão "Mais" + botão "PNG próprio"
- [ ] Botão "Mais" abre Dialog com 30 emojis agrupados por categoria
- [ ] Botão "PNG próprio" faz upload e seta `iconUrl`
- [ ] Botão "Gerar thumbnail" fica disabled enquanto inválido
- [ ] Ao clicar "Gerar", chama `/api/imagens/m4/render`, recebe URL stub, mostra no preview area
- [ ] Preview area mostra a imagem + botão "Fazer Download"

### Técnico
- [ ] `pnpm typecheck` passa sem erros
- [ ] `pnpm lint` passa sem warnings
- [ ] `pnpm build` completa com sucesso
- [ ] Middleware protege todas as rotas exceto `/login` e assets
- [ ] Schema Zod do M4 valida corretamente os 3 cenários (2 linhas, 3 linhas, frame faltando)
- [ ] Brand config é fonte única — nenhuma cor hex hardcoded em componente

### Estética
- [ ] Geist Sans aplicada em toda UI
- [ ] Espaçamento e hierarquia tipográfica conforme mockups (referência: padding 40-44px no container principal, eyebrows uppercase, h1 28px peso 500)
- [ ] Bordas sutis (0.06α)
- [ ] Roxo `#553679` aplicado APENAS em: logo, CTA primário, ícone do card ativo, badges roxas, item ativo em hover
- [ ] Sidebar branca, app bg `#FAFAF9`

---

## 16. Após implementação

Quando terminar:
1. Atualizar `SESSION_HANDOFF.md` com o que foi implementado
2. Registrar bugs/dúvidas encontradas em `DIVIDAS_PROJETO.md`
3. Avisar Rafael para validar e iniciar **Bloco C** (render visual do M4)
4. **Apagar este arquivo (`IMPL_BASE_M4.md`)** após confirmação de Rafael

---

## 17. Em caso de dúvida

- Decisões de produto: registrar em `DIVIDAS_PROJETO.md` seção "Decisões Pendentes" e pausar
- Decisões técnicas menores: documentar inline com `// NOTE:` e seguir
- Bugs ou comportamentos estranhos: registrar em `DIVIDAS_PROJETO.md` seção "Bugs"
- Nunca inventar contexto de produto. Em dúvida, perguntar.
