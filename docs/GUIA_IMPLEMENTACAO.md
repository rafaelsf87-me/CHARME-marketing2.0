# GUIA_IMPLEMENTACAO.md
## Guia de Implementação — Padrões e Procedimentos

**Versão:** 0.1
**Última atualização:** 13/05/2026
**Status:** Doc permanente — referência viva durante todo o desenvolvimento

---

## 0. Como usar este documento

Este guia contém **padrões genéricos e procedimentos permanentes** do projeto. Não detalha submódulos específicos — para isso, ver:
- `SPEC.md` — especificação funcional por submódulo
- `ARCHITECTURE.md` — arquitetura geral e decisões técnicas
- `IMPL_{MÓDULO}.md` — documentos temporários de implementação (criados sob demanda, apagados após implementação concluída)

**Ordem de leitura antes de codificar:**
1. `CLAUDE.md` — contexto e convenções gerais
2. Este arquivo (`GUIA_IMPLEMENTACAO.md`) — padrões de execução
3. `SESSION_HANDOFF.md` — estado atual do projeto
4. `DIVIDAS_PROJETO.md` — pendências e decisões em aberto
5. `IMPL_{MÓDULO}.md` — quando trabalhando em módulo específico

---

## 1. Pré-Requisitos e Setup Local

### Software
- **Node.js:** 20.x LTS ou superior
- **Package manager:** `pnpm` (preferido — mais rápido e econômico em disco)
- **Git**
- **Vercel CLI** (opcional, útil para envs e deploy): `npm i -g vercel`

### Clonar e instalar
```bash
git clone <repo>
cd marketing-ia-charme
pnpm install
```

### Variáveis de ambiente
Criar `.env.local` na raiz a partir do template `.env.example`:

```env
# Database
DATABASE_URL="postgres://..."           # Vercel Postgres

# Auth
NEXTAUTH_SECRET="..."                   # gerar com: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"    # em prod: https://...

# IA — Imagens
FAL_KEY="..."                           # Flux Kontext (fal.ai) — M1
OPENAI_API_KEY="..."                    # GPT Image 2 — M3

# Storage
BLOB_READ_WRITE_TOKEN="..."             # Vercel Blob

# Admin inicial (seed do primeiro usuário admin)
ADMIN_EMAIL="rafael@..."
ADMIN_PASSWORD_HASH="..."               # bcrypt hash
```

### Rodar localmente
```bash
pnpm dev          # http://localhost:3000
pnpm build        # build de produção
pnpm start        # roda build localmente
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
```

### Banco de dados local
Para dev, usar a própria DB de prod (Vercel Postgres tem suficientes free queries) ou Docker com Postgres local. Migrations rodam via Drizzle (ver seção 9).

---

## 2. Variáveis de Ambiente — Referência Completa

| Var | Onde se obtém | Obrigatória |
|---|---|---|
| `DATABASE_URL` | Vercel Dashboard → Storage → Postgres | ✅ |
| `NEXTAUTH_SECRET` | gerar local: `openssl rand -base64 32` | ✅ |
| `NEXTAUTH_URL` | URL pública (local: `http://localhost:3000`) | ✅ |
| `FAL_KEY` | https://fal.ai → API Keys | ✅ (M1) |
| `OPENAI_API_KEY` | https://platform.openai.com → API Keys | ✅ (M3) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Dashboard → Storage → Blob | ✅ |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` | definidos pelo dev para seed do admin inicial | ✅ (primeira instalação) |

**Nunca commitar `.env.local`.** Vercel pega envs do dashboard em produção.

---

## 3. Padrões de Código

### Estrutura por feature (App Router)

```
app/
└── imagens/
    └── m4-thumbnails/
        ├── page.tsx              # Server Component (entry)
        ├── _components/          # Componentes locais do submódulo
        │   ├── template-grid.tsx
        │   ├── form-thumbnail.tsx
        │   └── preview.tsx
        └── _lib/                 # Helpers locais (se necessário)
            └── validate.ts
```

**Convenção:**
- Pastas com `_prefix` não são rotas — apenas organização interna
- Cada submódulo tem seus `_components` próprios; só promove para `components/` global quando reutilizado por 2+ submódulos

### Server vs Client Components

**Server Components (padrão):**
- Renderização inicial
- Acesso a DB / APIs
- Fetch de templates / brand config

**Client Components (`"use client"`):**
- Hooks (`useState`, `useEffect`)
- Event handlers (clique, form submit)
- Bibliotecas que dependem de `window`

Manter o boundary client/server o mais baixo possível na árvore — passar dados serializáveis como props.

### Naming
- **Componentes:** PascalCase (`FormThumbnail.tsx`, `TemplateGrid.tsx`)
- **Hooks:** camelCase com prefixo `use` (`useTemplateSelector`)
- **Utils / lib:** kebab-case (`sharp-compose.ts`, `flux-image.ts`)
- **Rotas:** kebab-case (`m4-thumbnails-feed`)
- **DB tables / fields:** snake_case (`users`, `password_hash`)
- **Variáveis código:** inglês para conceitos genéricos, português para domínio de negócio
  - ✅ `const userId = ...`
  - ✅ `const corPrimaria = brandM4.palette.boxLine1`

### TypeScript
- `strict: true`, `noImplicitAny: true`
- Tipos exportados em `lib/types/` quando reutilizados
- Tipos locais inline em `_lib/` do submódulo quando específicos
- Evitar `any`; quando inevitável, comentar `// any: motivo`

### Imports — ordem
```typescript
// 1. Builtin (node, react)
import { useState } from "react"

// 2. External
import { z } from "zod"
import sharp from "sharp"

// 3. Internal absoluto (@/)
import { brandM4 } from "@/lib/brand/m4.brand"
import { Button } from "@/components/ui/button"

// 4. Relativo
import { validateInput } from "./_lib/validate"
```

---

## 4. Padrões de API Routes

### Estrutura padrão

Rota: `app/api/imagens/{modulo}/{ação}/route.ts`

```typescript
// app/api/imagens/m4/render/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth/config"
import { renderM4Thumbnail } from "@/lib/sharp-compose"

const InputSchema = z.object({
  templateId: z.enum(["v1-topo", "v2-centro", "v3-rodape"]),
  frameUrl: z.string().url(),
  textLine1: z.string().min(1).max(60),
  textLine2: z.string().min(1).max(80),
  customIdea: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // 2. Validação
  const body = await req.json()
  const parsed = InputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Input inválido", details: parsed.error.flatten() }, { status: 400 })
  }

  // 3. Lógica de negócio
  try {
    const outputUrl = await renderM4Thumbnail(parsed.data)
    return NextResponse.json({ url: outputUrl })
  } catch (err) {
    console.error("M4 render error:", err)
    return NextResponse.json({ error: "Falha ao gerar thumbnail" }, { status: 500 })
  }
}
```

### Princípios

1. **Sempre validar com Zod.** Sem validação = sem confiança no input.
2. **Sempre checar auth.** Mesmo APIs "internas".
3. **Try/catch no topo da lógica.** Erros descem para resposta amigável (não vazar stack trace).
4. **Logs no servidor:** `console.error` com prefixo `[módulo]` para fácil grep.
5. **Resposta padrão:**
   - Sucesso: `{ data: ... }` ou `{ url: ... }` ou `{ ok: true }`
   - Erro: `{ error: "mensagem em PT", details?: ... }`
6. **Status codes:** 200/201 sucesso, 400 input inválido, 401 não autenticado, 403 sem permissão, 404 não encontrado, 500 erro de servidor, 504 timeout (Vercel).

### Timeout no Vercel Hobby (10s)

Operações que podem estourar:
- **Flux Kontext** (~8s) — fica no limite. Se passar consistente, considerar:
  - Modo `streaming` da fal.ai (retorna progresso)
  - Migrar pra Vercel Pro ($20/mês)
- **GPT Image 2 (M3)** — ainda a testar em produção. Pode exigir Pro.

---

## 5. Padrões de Brand Config

### Acessar paleta
```typescript
import { brandBase } from "@/lib/brand/base.config"

const cor = brandBase.colors.primaryDark  // "#553679"
```

### Acessar config de submódulo
```typescript
import { brandM4 } from "@/lib/brand/m4.brand"

const corCaixa1 = brandM4.palette.boxLine1
const fonte = brandM4.fonts.text
const { width, height } = brandM4.dimensions.thumbnail
```

### Adicionar nova cor à base
1. Editar `lib/brand/base.config.ts` — adicionar token semanticamente nomeado
2. Atualizar `ARCHITECTURE.md` seção 6 (paleta)
3. Atualizar tipos se houver (`type ColorToken`)
4. **Não duplicar valores entre módulos.** Se 2 módulos usam a mesma cor, ela mora na `base.config.ts`.

### Adicionar nova fonte
1. Adicionar arquivo da fonte em `public/fonts/` (formato `.woff2` preferido)
2. Importar no `lib/brand/{modulo}.brand.ts`
3. Carregar no Satori (ver seção 7)
4. Para CSS de tela (HTML rendering), declarar `@font-face` em `app/globals.css`

---

## 6. Padrões de Templates

### Estrutura JSON do template

Cada template default vive em `templates/defaults/{módulo}/{variação}/` com arquivos:
- `template.json` — definição da estrutura
- `preview.png` — thumbnail visual do template para o seletor (gerado uma vez, commitado)
- `assets/` (opcional) — imagens, ícones, decorações específicas do template

**Schema mínimo do `template.json`:**
```json
{
  "id": "v1-topo",
  "module": "m4",
  "name": "Topo",
  "description": "Bloco de texto no terço superior do frame",
  "version": "1.0",
  "dimensions": { "width": 1080, "height": 1920 },
  "zones": [
    { "id": "frame", "type": "image", "x": 0, "y": 0, "w": 1080, "h": 1920 },
    { "id": "textBlock", "type": "composite", "x": 0, "y": 200, "w": 1080, "h": 400 }
  ],
  "elements": [
    { "...detalhes do conteúdo do textBlock..." }
  ]
}
```

**Schema completo por módulo:** definido no `IMPL_{MÓDULO}.md` correspondente.

### Templates default vs custom

- **Default:** vivem em `templates/defaults/` — versionados no Git, **imutáveis em runtime**
- **Custom:** vivem em `templates/custom/` — criados via Template Creator, **excluíveis pelo usuário**

**`templates/custom/` deve estar no `.gitignore`** se os customs são privados a cada instância. Se compartilhados, comitar. **Decisão atual:** comitar (sistema interno, equipe pequena).

### Adicionar nova variação default

1. Criar pasta `templates/defaults/{módulo}/{nova-variação}/`
2. Criar `template.json` seguindo o schema
3. Gerar `preview.png` (pode ser via script ou Figma export)
4. O sistema **detecta automaticamente** novas variações (lista folders na build)

---

## 7. Padrões de Render

### Sharp.js (compositing puro) — M2, M4

**Quando usar:** quando o resultado é deterministico — sobrepor texto + imagens em posições fixas.

**Padrão:**
```typescript
import sharp from "sharp"

export async function compose({ baseImagePath, overlays }: ComposeInput) {
  return await sharp(baseImagePath)
    .composite(overlays.map(o => ({
      input: o.buffer,
      top: o.y,
      left: o.x,
    })))
    .png()
    .toBuffer()
}
```

### Satori (HTML/CSS → PNG)

**Quando usar:** quando o conteúdo é "rich" — texto com formatação, caixas com border-radius, layout flex.

**Padrão:**
```typescript
import satori from "satori"
import { Resvg } from "@resvg/resvg-js"
import fs from "fs/promises"

const fontData = await fs.readFile("public/fonts/Montserrat-Bold.ttf")

const svg = await satori(
  <div style={{ display: "flex", ... }}>
    {/* JSX padrão CSS */}
  </div>,
  {
    width: 1080,
    height: 1920,
    fonts: [{ name: "Montserrat", data: fontData, weight: 700, style: "normal" }],
  }
)

const png = new Resvg(svg).render().asPng()
```

### Hospedagem de fontes

| Fonte | Estratégia | Onde |
|---|---|---|
| Montserrat | Self-hosted .ttf/.woff2 | `public/fonts/Montserrat-*.ttf` |
| Times New Roman MT | Self-hosted .ttf | `public/fonts/TimesNewRomanMT-*.ttf` |

**Atenção licenciamento:** Times New Roman MT é fonte da Monotype com licença. **Antes da implementação do M4**, validar se a Charme do Detalhe tem licença comercial ou usar fallback compatível (Liberation Serif, PT Serif). Registrar em `DIVIDAS_PROJETO.md` se virar bloqueio.

### Pipeline padrão de geração

```
1. Receber input (textos, imagens, configurações)
2. Validar (Zod)
3. Buscar template JSON do disco
4. Combinar input + template → "render context"
5. Renderizar (Sharp ou Satori, ou ambos em pipeline)
6. Upload pro Vercel Blob (buffer temporário)
7. Retornar URL pro front
8. Front mostra preview + botão Download
9. (Background) Vercel Blob expira em X minutos
```

---

## 8. Padrões de Autenticação

### Middleware (proteção de rotas)

`middleware.ts` na raiz:
```typescript
import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      // Rotas /admin/* exigem role admin
      if (req.nextUrl.pathname.startsWith("/admin")) {
        return token?.role === "admin"
      }
      // Resto exige só estar logado
      return !!token
    },
  },
})

export const config = {
  matcher: ["/((?!login|api/auth|_next|favicon).*)"],
}
```

### Server-side check em pages/components
```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { redirect } from "next/navigation"

export default async function Page() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  // ...
}
```

### Senha
- **Hash:** bcrypt com cost 10
- **Nunca** logar ou retornar password_hash em qualquer endpoint
- Tela `/admin/usuarios` faz hash no servidor antes de gravar

---

## 9. Database (Vercel Postgres + Drizzle)

### Stack
- **ORM:** Drizzle (leve, type-safe, serverless-friendly)
- **Driver:** `@vercel/postgres`
- **Migrations:** `drizzle-kit`

### Schema (inicial)

```typescript
// lib/db/schema.ts
import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("operator"),  // "admin" | "operator"
  createdAt: timestamp("created_at").notNull().defaultNow(),
})
```

### Comandos
```bash
pnpm drizzle-kit generate    # gera migration a partir do schema
pnpm drizzle-kit push        # aplica diretamente (dev)
pnpm drizzle-kit migrate     # aplica migrations (prod, recomendado)
```

### Seed inicial
Script `scripts/seed-admin.ts` lê `ADMIN_EMAIL` e `ADMIN_PASSWORD_HASH` do `.env` e insere o primeiro admin. Rodar uma vez após primeira instalação:

```bash
pnpm tsx scripts/seed-admin.ts
```

---

## 10. Deploy

### Vercel
- Conectar repo do GitHub ao Vercel
- Branch `main` → produção
- Branches feature → preview automático
- Adicionar todas as env vars no Vercel Dashboard → Settings → Environment Variables
- Storage (Postgres + Blob): criar via dashboard, copiar URL/token para envs

### Comandos via Vercel CLI
```bash
vercel              # deploy preview manual
vercel --prod       # deploy produção manual
vercel env pull     # baixa env vars de prod para .env.local
vercel logs <url>   # ver logs de uma execução
```

---

## 11. Git Workflow

### Branches
- `main` — produção
- `dev` (opcional) — staging contínuo
- `feat/m4-thumbnails` — feature
- `fix/auth-redirect` — bugfix
- `refactor/brand-config` — refatoração

### Commits
- Mensagens **em português**
- Formato: `tipo(escopo): descrição curta`
- Tipos: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `test`
- Exemplos:
  - `feat(m4): adicionar template v2-centro`
  - `fix(auth): corrigir redirect após login`
  - `docs: atualizar SPEC.md com decisão de M5`

### Pull Requests
- 1 PR por feature/fix
- Descrição: link com seção da SPEC, screenshots de UI quando aplicável
- Squash merge para main

---

## 12. Como Adicionar Novo Submódulo (futuro M6, M7...)

Checklist:
1. [ ] Atualizar `SPEC.md` — adicionar seção do submódulo
2. [ ] Atualizar `ARCHITECTURE.md` — incluir na estrutura de pastas e ordem de implementação
3. [ ] Criar `lib/brand/m{n}.brand.ts` estendendo `brandBase`
4. [ ] Criar pasta `app/imagens/m{n}-{slug}/` com `page.tsx` + `_components/`
5. [ ] Criar pasta `app/api/imagens/m{n}/`
6. [ ] Criar pasta `templates/defaults/m{n}-{slug}/`
7. [ ] Adicionar entry no sidebar (componente de navegação)
8. [ ] Adicionar entry no índice `/imagens/page.tsx` (card do submódulo)
9. [ ] Se usar Template Creator: criar `app/imagens/template-creator/m{n}-layouts/page.tsx`
10. [ ] Criar `IMPL_M{N}.md` temporário com detalhes de implementação
11. [ ] Implementar
12. [ ] Apagar `IMPL_M{N}.md` após concluir

---

## 13. Como Adicionar Novo Módulo Principal (futuro Copy, Ideias, etc.)

Checklist:
1. [ ] Decidir: mesmo monorepo ou repo separado?
2. [ ] Se mesmo monorepo:
   - Criar pasta `app/{modulo-principal}/` (ex: `app/copy/`)
   - Criar pasta `app/api/{modulo-principal}/`
   - Adicionar card no Dashboard (`app/page.tsx`)
   - Adicionar seção no sidebar
3. [ ] Se repo separado:
   - Replicar estrutura base (auth, brand config, layout shell)
   - Compartilhar paleta via NPM package ou submodule
4. [ ] Criar `SPEC_{MÓDULO}.md` e `ARCHITECTURE_{MÓDULO}.md` específicos

---

## 14. Troubleshooting

### "Module not found" após adicionar dependência
```bash
pnpm install        # reinstalar
rm -rf .next        # limpar cache
pnpm dev
```

### Erro de timeout no Vercel
- Verificar se a função excede 10s (Hobby)
- Considerar streaming response
- Considerar upgrade pra Pro

### Erro de auth — "JWT expired"
- Sessão expirou; usuário precisa relogar
- Default NextAuth: sessão de 30 dias

### Sharp falha em build do Vercel
Adicionar no `next.config.js`:
```javascript
module.exports = {
  experimental: { serverComponentsExternalPackages: ["sharp"] }
}
```

### Drizzle migration falha
- Verificar `DATABASE_URL` está acessível
- Em dev, `drizzle-kit push` é mais permissivo
- Em prod, sempre `migrate`

---

## 15. Comandos Úteis

| Comando | O que faz |
|---|---|
| `pnpm dev` | Roda dev server |
| `pnpm build` | Build de produção |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check sem emit |
| `pnpm format` | Prettier write |
| `pnpm drizzle-kit push` | Aplica schema ao DB (dev) |
| `pnpm drizzle-kit generate` | Gera migration |
| `pnpm tsx scripts/seed-admin.ts` | Cria admin inicial |
| `pnpm tsx scripts/limpar-customs.ts` | Limpa todos os templates custom (dev/reset) |
| `vercel env pull` | Baixa envs do Vercel pro local |
| `vercel logs <url>` | Logs de execução |

---

## 16. Diretrizes de Qualidade

### Princípio geral
Sistema é **interno, pequeno, não escala**. Foco em qualidade base sem over-engineering.

### Testes
- **Não criar suíte de testes E2E completa.** Equipe pequena, validação manual via uso real.
- **Criar testes unitários apenas para:**
  - Funções de render (`sharp-compose.ts`, `template-engine.ts`)
  - Schemas Zod críticos
  - Helpers de validação de input
- **Framework:** Vitest (leve, integra bem com Vite/Next)

### Code review
- Rafael revisa manualmente
- Pode pedir revisões assistidas via slash commands específicos (ex: `/reviews`, `/design-reviews`) — aguardar instrução, não rodar automaticamente

### Performance
- Lazy load por rota é padrão (App Router)
- Imagens via `next/image` quando estáticas
- Evitar bibliotecas pesadas; cada dependência justificada no PR

### Segurança básica
- Variáveis sensíveis só em env (nunca no código)
- Auth em todas as rotas (middleware)
- Validação de TODO input externo (Zod)
- Sem upload de arquivos fora dos buckets do Vercel Blob
- Limite de tamanho de upload (default sugerido: 10MB)

---

## 17. Onde Pedir Ajuda

- Bugs no projeto: registrar em `DIVIDAS_PROJETO.md`
- Decisões de produto travadas: registrar em `DIVIDAS_PROJETO.md` seção "Decisões Pendentes"
- Bloqueios de sessão: registrar em `SESSION_HANDOFF.md`
- Dúvida sobre código de outro submódulo: **não importar**, pedir Rafael revisar

---

## Changelog

### v0.1 — 13/05/2026
- Versão inicial do guia
