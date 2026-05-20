# SESSION_HANDOFF.md
## Handoff Entre Sessões de Desenvolvimento

**Como usar:** ao final de cada sessão de desenvolvimento, atualizar este arquivo com o estado atual. Ao iniciar nova sessão, ler primeiro este arquivo + `DIVIDAS_PROJETO.md`.

**Formato:** sessão mais recente no topo. Sessões antigas movidas para "Histórico" depois de 5 sessões mais novas.

---

## 📍 Estado Atual

**Fase:** M2 V2.0 Templates Fixos PROD-READY (merged em main 20/05/2026, HEAD `5dd76c0`)
**Última atualização:** 20/05/2026
**Próxima tarefa:** Aguardando Rafael gerar 2-3 carrosseis reais V2 em prod (https://charme-marketing2-0.vercel.app) antes de qualquer discussão de sunset T2. T2 V1 (HEAD `0273456`) coexiste intacto como "Template 1".

### Marco V2.0 (ciclo 20/05/2026)

| Item | Status |
|---|---|
| Branch `feat/v2-templates` | ✅ merged em main (--no-ff) |
| Custo total V2.0.0 → V2.0.4 | ~$0.73 (LLM + gpt-image-1 + smokes) |
| Bugs resolvidos no ciclo | 11 (V2-001 a V2-011) — todos em DIVIDAS_PROJETO.md |
| Anti-invenção REGRA #0 | ✅ defesa em 4 camadas (prompt + validate + retry + fallback regex) |
| Registry M2 ativo | "Template 1" (T2 V1) + "Template 2 — Fixos" (V2.0) |
| Deploy Vercel | ✅ verde — `/brand/icons-v2/icon-sparkle.svg` HTTP 200 confirmado |
| V2.1 backlog | 7 itens estéticos registrados em DIVIDAS_PROJETO.md |

**Próximas decisões esperadas Rafael:**
- Validar V2 em prod com briefings reais (3-5 carrosseis em uso)
- Decidir sunset T2 (somente após V2 amadurecer em uso real)
- Priorizar V2.1 estética (7 itens backlog) vs próximos módulos (M3 já entregue, falta M5)

### Status por componente

| Componente | Status |
|---|---|
| SPEC.md | ✅ v0.4 |
| ARCHITECTURE.md | ✅ v0.4 |
| CLAUDE.md | ✅ v0.1 |
| GUIA_IMPLEMENTACAO.md | ✅ v0.1 (referência viva) |
| Scaffold Next.js 14 + deps | ✅ |
| tsconfig strict + tailwind + Geist Sans | ✅ |
| Brand config (`base.config.ts` + `m4.brand.ts`) | ✅ |
| Logo placeholder SVG | ✅ (Rafael substitui depois) |
| Drizzle schema + client + seed script | ✅ |
| NextAuth (Credentials + JWT) | ✅ |
| Middleware (auth + admin) | ✅ |
| Layout shell (Sidebar toggle + Breadcrumb) | ✅ |
| Componentes globais (TooltipInfo, UploadField, TextFieldWithCounter, DownloadButton) | ✅ |
| Shadcn primitives (Button, Input, Tooltip, Dialog, Label, Textarea) | ✅ |
| Tela `/login` | ✅ UI completa |
| Tela `/` (Dashboard) | ✅ |
| Tela `/admin/usuarios` + API CRUD | ✅ |
| M4: schema + templates + 30 emojis 3D + tooltips | ✅ |
| M4: página + form + grid + upload + inputs + emoji picker + preview | ✅ |
| API `/api/imagens/m4/render` (**real** Sharp + Satori) | ✅ |
| API `/api/upload` (Vercel Blob client-upload) | ✅ |
| Fonte Tinos (Apache 2.0) self-hosted | ✅ |
| Florzinha placeholder SVG | ✅ |
| Cache em memória de emojis (Map + TTL 1h) | ✅ |
| M1 Foto Produto | 🟡 Implementação parcial (código + UI prontos; faltam assets, FAL_KEY, Vercel Pro) |
| M2 Posts Instagram | ⚪ Placeholder |
| M3 Banners Website | ⚪ Placeholder |
| M5 Banners Email | ⚪ Placeholder |
| Template Creator | ⚪ Placeholder |
| Render real M4 (Sharp + Satori) | ✅ Bloco C concluído |
| Build (`next build`) | ✅ 16 rotas geradas, 0 erros |
| Typecheck (`tsc --noEmit`) | ✅ 0 erros |
| Deploy Vercel (Hobby, region gru1) | ✅ `https://charme-marketing2-0.vercel.app` |
| Vercel Postgres (Neon, region gru1) | ✅ schema aplicado via `pnpm db:push` |
| Vercel Blob (private, region gru1) | ✅ `charme-marketing-blob` |
| Seed admin (rafael@charmedodetalhe.com) | ✅ |
| Cron limpeza Blob (03h UTC) | ✅ `/api/cron/cleanup-blob` (commit 83d7b6f) |
| NextAuth `resolveAuthUrl()` para previews | ✅ |

---

## 🚧 Bloqueios Ativos

### Aguardando Rafael
1. **Validação M4 end-to-end em produção** — login + fluxo completo de geração (template → upload → textos → emoji → gerar → STUB). Não bloqueia M1; Rafael fará em paralelo.
2. **Assets M1** — adicionar os 11 PNGs em `public/templates/m1/{id}/image.png`.
3. **FAL_KEY** — no `.env.local` e no Vercel (Production + Preview).
4. **Confirmar Vercel Pro** ativo (maxDuration=60s).
5. **Substituição da `sofa-capa-2`** — remover overlay circular (template ainda inutilizável).
6. **SVG real do logo** — placeholder casinha em `public/brand/logo.svg`.
7. **SVG definitivo da florzinha** — placeholder 3-pétalas em `public/brand/florzinha.svg`. Substituir pelo definitivo antes do go-live.

### Pendências menores
- Dimensões M3 desktop/mobile (Rafael confirmando com equipe — DEC-001)
- Ajuste visual da foto-template "Sofá 2" do M1 (remover overlay circular)

---

## ▶️ Comandos para reiniciar a fase de testes (após credenciais)

```bash
# 1. Criar .env.local com Postgres + Blob + NEXTAUTH_SECRET
cp .env.example .env.local
# Editar .env.local com os valores reais

# 2. Aplicar schema no Postgres
pnpm db:push

# 3. Criar admin inicial
pnpm seed:admin

# 4. Subir dev
pnpm dev
```

Sanity check rápido:
- `http://localhost:3000/login` → entrar com `rafael@charmedodetalhe.com` / `ChangeMe2026!CharmeIA`
- Redirect para `/` → Dashboard com "Bora Criar!!!"
- Clicar em "Geração de Imagens" → `/imagens/m4-thumbnails`
- Selecionar template V2 ou V4 → mostra linha 3
- Upload do frame → preview no slot
- Clicar "Gerar thumbnail" → preview area mostra o próprio frame (stub) com aviso amarelo "stub · render real no Bloco C"
- `/admin/usuarios` → CRUD funciona, "Deletar" do próprio user fica disabled

---

## 📝 Histórico de Sessões

### Sessão 3 — 14/05/2026 — M1 Implementação Parcial + Migração `@fal-ai/client`
**O que foi feito:**
- **DEC-004 e DEC-005** registradas em `DIVIDAS_PROJETO.md` antes do código (coerência multi-móveis em Foto Ambiente; pipeline 2-step + cache aprovado).
- **`@fal-ai/client@1.10.1` instalado** (migração preventiva — o `@fal-ai/serverless-client@0.15.0` veio com aviso npm `deprecated: Package no longer supported`). Pacote deprecated em código novo não passa.
- **Brand config M1** (`lib/brand/m1.brand.ts`) — fonte única de dimensões (1080×1080 em todos os tipos), cache (LRU 30min/50), modelos fal.
- **Libs M1** completas:
  - `schema.ts` — Zod com `superRefine` validando cenário ↔ tipoFoto ↔ móvel
  - `templates.ts` — 11 templates default + helpers de filtragem
  - `tooltips.ts` — 14 tooltips PT-BR exatos da spec + `getUploadLabel()` dinâmico
  - `prompts.ts` — Step1, Step2 (com MULTI-FURNITURE COHERENCE), Elastico, DetalheTecido (todos EN com comentários PT)
  - `cache.ts` — LRU com cache key `sha256(blobUrl|tipoCapa).slice(0,16)`
  - `fal-client.ts` — wrappers Flux Kontext + Grounded-SAM, tipagem narrow local (`FluxImageRef`, `FluxKontextOutput`, `GroundedSamOutput`) — sem `any`
  - `render-pipeline-a.ts` — Pipeline A (2-step com cache, dimensões via brand config)
  - `render-pipeline-b.ts` — Pipeline B (cleanup single-step)
  - `render.ts` — orquestrador
- **API route** `/api/imagens/m1/render` — auth, Zod, `maxDuration=60`, `runtime=nodejs`, log de duração.
- **UI completa** em `app/imagens/m1-vitrine/`:
  - `page.tsx` (substitui placeholder)
  - 8 componentes em `_components/`: tab móvel, step capa, step foto, step cenário (condicional, fade-in), step upload (label dinâmico), step customização, generate-button, preview-area
  - Orquestrador `m1-form.tsx` que zera `cenarioId` ao trocar móvel/tipo e zera upload ao alternar Pipeline A↔B
- **Script `pnpm m1:generate-masks`** (`scripts/generate-m1-masks.ts`) — gera 11 masks via Grounded-SAM, skip se já existe, warn se PNG ausente, fail-fast sem FAL_KEY.
- **`next.config.mjs`** atualizado: `outputFileTracingIncludes['/api/imagens/m1/render'] = ['./public/templates/m1/**/*']` (pra empacotar templates + masks na função serverless).
- **`.env.example`** já tinha `FAL_KEY=` — sem mudança necessária.
- **Validações:** `tsc --noEmit` → 0 erros · `next lint` → 0 warnings · `next build` → ✓ 17 rotas (16 antes + `/api/imagens/m1/render`).

**DEC-006 — descoberta e resolução na mesma sessão:**
Ao tipar `fal.subscribe()` percebemos que o `FluxKontextInput` oficial do `@fal-ai/client@1.10` **não aceita** `mask_url` nem `reference_image_url`. O endpoint `fal-ai/flux-pro/kontext` aceita apenas `{ image_url, prompt, aspect_ratio, guidance_scale, output_format, ... }`. O `IMPL_M1.md` foi escrito presumindo esses campos.

**Resolução (Rafael · Opção A):** Step 2 do Pipeline A migrado para `fal-ai/flux-kontext-lora/inpaint`, que aceita `image_url + mask_url + reference_image_url + prompt` no tipo oficial `BaseKontextInpaintInput` (linhas 1864-1924 de `node_modules/@fal-ai/client/src/types/endpoints.d.ts`). Step 1 (capa neutra) e Pipeline B continuam em `fal-ai/flux-pro/kontext`. Arquitetura 2-step + cache **preservada**.

**Mudanças aplicadas:**
- `lib/brand/m1.brand.ts`: 3 endpoints em `pipeline.falModels` (`groundedSam`, `fluxKontext`, `fluxKontextInpaint`)
- `lib/m1/fal-client.ts`: nova função `callFluxKontextInpaint()` com tipo local `FluxKontextInpaintInput`; `callFluxKontext()` simplificado (só `image_url + prompt`); `callGroundedSam()` inalterado
- `lib/m1/render-pipeline-a.ts`: Step 2 agora chama `callFluxKontextInpaint`; Step 1 segue em `callFluxKontext`
- `docs/IMPL_M1.md` bump pra v1.1
- DEC-006 movida pra "Resolvidas" em `docs/DIVIDAS_PROJETO.md`

**Custo Pipeline A:** ~$0.10/img total (Step 1 + Step 2). Endpoint usado no Step 2 é `dev`+LoRA — validar qualidade real na fase de treinamento; se insuficiente, Opção B (re-arquitetar sem mask) fica como alternativa documentada.

**O que está em progresso:**
- Aguardando Rafael adicionar 11 PNGs, configurar FAL_KEY e confirmar Vercel Pro.

**Próximos passos:**
1. Rafael adiciona 11 PNGs em `public/templates/m1/{id}/image.png`
2. Rafael configura `FAL_KEY` em `.env.local` e Vercel
3. Confirma Vercel Pro
4. Rodar `pnpm m1:generate-masks` (gera as 11 masks)
5. Commitar `public/templates/m1/`
6. Validar end-to-end com Rafael (5–10 outputs reais; testar qualidade do `flux-kontext-lora/inpaint`)
7. Refinar prompts na fase de treinamento (estampas simples → complexas)
8. Marcar DEC-005 como RESOLVIDA quando 2-step funcionar no real

**Bloqueios encontrados:** nenhum (DEC-006 resolvida na mesma sessão).

**Decisões durante implementação:**
- **`@fal-ai/client` 1.0+** instalado (migração feita preventivamente — pacote `serverless-client` removido). Não criada REF-002 (resolvida antes de virar dívida).
- **Tipagem narrow local** dos outputs fal (sem `any`) usando `FalImageRef`, `FluxKontextOutput`, `GroundedSamOutput`.
- **Storage upload** via `fal.storage.upload(new Blob([new Uint8Array(buf)], {...}))` — Buffer → Uint8Array → Blob.
- **Sem mock** — STUB explícito não cabe aqui, código real está pronto e quebra se chamado sem FAL_KEY/assets (visível no log).
- **`nanoid@5`** (ESM-only) passou no build do Next 14 sem ajuste.
- **`outputFileTracingIncludes`** glob `public/templates/m1/**/*` cobre image, mask e thumbnail dos 11 templates.

**Dívidas registradas:** [DEC-004], [DEC-005] em `DIVIDAS_PROJETO.md`. DEC-006 criada e resolvida na mesma sessão (movida para Resolvidas).

---

### Sessão 1 de Infra — 14/05/2026 — Deploy Vercel + Cron Blob + NextAuth previews
**O que foi feito:**
- **Deploy Vercel funcional** em `https://charme-marketing2-0.vercel.app` (scope `lojamaniadelar-8505's projects`, plano Hobby).
- **Vercel Postgres (Neon)** provisionado — `charme-marketing-db`, region São Paulo (gru1), prefixo `POSTGRES_*` em Production/Preview/Development.
- **Vercel Blob** provisionado — `charme-marketing-blob`, region gru1, acesso Private.
- **Setup local:** `vercel link`, `vercel env pull`, `pnpm approve-builds` (sharp/esbuild/bufferutil/unrs-resolver), `pnpm db:push` (schema aplicado via Drizzle), `pnpm seed:admin` (admin `rafael@charmedodetalhe.com` criado).
- **Cron de limpeza de Blob** (commit `83d7b6f`):
  - `app/api/cron/cleanup-blob/route.ts` — deleta blobs com mais de 7 dias; preserva prefixo `templates/`; autenticado via `Bearer ${CRON_SECRET}`.
  - `vercel.json` — schedule diário `0 3 * * *` (03h UTC).
  - `middleware.ts` — matcher exclui `/api/cron` do auth do NextAuth.
- **NextAuth resolveAuthUrl()** em `lib/auth/config.ts` — sobrescreve `process.env.NEXTAUTH_URL` em previews/dev (Vercel previews têm URL dinâmica). `trustHost: true` mantido como prep para futuro upgrade NextAuth v5 (no-op em v4; ver REF-001 em DIVIDAS_PROJETO.md).
- **`.env.example` saneado** — senha admin trocada por `CHANGEME`, adicionado `CRON_SECRET` como placeholder.
- **`pnpm-workspace.yaml`** — aprova builds nativos (sharp, esbuild, bufferutil, unrs-resolver) pra evitar `ERR_PNPM_IGNORED_BUILDS` em CI.
- **Envs configuradas no Vercel** (Production + Preview): `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CRON_SECRET` + envs auto-injetadas pelos integrations Neon e Blob.
- **Validação:** `next build` → 16 rotas geradas, 0 erros (rota `/api/cron/cleanup-blob` registrada como ƒ).

**O que está em progresso:**
- Validação M4 end-to-end na URL de produção (Rafael fará em paralelo, não bloqueia avanço).

**Próximos passos:**
1. Aguardar entrega do `IMPL_M1.md` para iniciar implementação do **M1 Foto Produto**.
2. Rafael valida M4 em produção e reporta resultado.
3. Adicionar `FAL_KEY` e `OPENAI_API_KEY` no Vercel quando M1/M3 entrarem em desenvolvimento.

**Bloqueios encontrados:**
- Drizzle-kit não carrega `.env.local` automaticamente → workaround `npx -y dotenv-cli -e .env.local -- pnpm db:push`.
- `pnpm 11` bloqueia build scripts por default → resolvido com `pnpm approve-builds` e commit do `pnpm-workspace.yaml`.

**Decisões durante implementação:**
- **Neon Postgres** com prefixo `POSTGRES` (não `STORAGE`) pra `@vercel/postgres` consumir sem alteração de código.
- **`trustHost: true`** mantido como prep mesmo sendo no-op em NextAuth v4 (ver REF-001).
- **Senha admin** mantida fraca temporariamente (`ChangeMe2026!CharmeIA`); Rafael troca via `/admin/usuarios` após validar acesso.
- **Cron schedule 03h UTC** (00h BRT) — janela de menor uso, sem risco de conflito com geração ativa.

**Dívidas registradas:** [REF-001] em `DIVIDAS_PROJETO.md`. [MEL-001] resolvida e movida.

---

### Sessão 2 — 13/05/2026 — Tinos + Bloco C (render real M4)
**O que foi feito:**
- **DEC-003 resolvida** — fonte M4 trocada de Times New Roman MT (Monotype, licenciada) para **Tinos** (Google Fonts, Apache 2.0, clone métrico open-source).
- **Self-host de Tinos** — `public/fonts/Tinos-Regular.ttf` (454KB) e `Tinos-Bold.ttf` (431KB) baixados do Google Fonts (`fonts.gstatic.com/.../v25/...`). Declaração `@font-face` em `app/globals.css` com fallback Google Fonts CDN.
- **Florzinha provisória** — `public/brand/florzinha.svg` (3 pétalas verdes `#4CDDC3`, 80×80, conforme spec do Rafael).
- **Docs atualizados** — SPEC v0.4 + ARCHITECTURE v0.4; DEC-003 movida para "Resolvidas" em DIVIDAS_PROJETO.md.
- **Bloco C — render real do M4** em `lib/m4/render.tsx`:
  - Pipeline: fetch frame → Sharp resize/cover 1080×1920 (com brightness/contrast condicional do campo Customização) → Satori (overlay com caixas rotacionadas −2,5°, florzinha no canto sup direito da L1, emoji 110px na última caixa) → Resvg → Sharp composite → upload Vercel Blob.
  - Geometria pixel-perfect: margem 80px, padding 32×16, caixa 112px, radius 8px, gap 8px, fonte Tinos Bold 80px, line-height 1.
  - Cache em memória de emojis (Map<url, {dataUri, ts}> com TTL 1h).
  - Cache em memória de font/florzinha (carrega uma vez por instância).
  - Parser simples de customização (regex pt-BR: brilho/contraste, ±15% / ±20%).
  - Falha de fetch de emoji é graciosa (loga + segue sem ícone).
  - Validação pós-render: dimensões finais 1080×1920 e formato PNG.
  - Log de duração: `[M4] render OK em Xms · <filename>`.
- **Stub removido** de `app/api/imagens/m4/render/route.ts`. Handler chama `renderM4Thumbnail` direto, com `runtime='nodejs'` e `maxDuration=60` (Pro/local; Hobby cap em 10s).
- **next.config.mjs** atualizado:
  - `serverComponentsExternalPackages: ['sharp', '@resvg/resvg-js']` — evita webpack tentar empacotar binários nativos.
  - `outputFileTracingIncludes` para garantir que `public/fonts/Tinos-*.ttf` e `public/brand/florzinha.svg` sejam empacotados no deploy Vercel da rota `/api/imagens/m4/render`.
- **Validação:** `tsc --noEmit` → 0 erros · `next build` → ✓ 15 rotas, 0 lint warnings.

**O que está em progresso:**
- Aguardando Rafael provisionar Vercel Postgres + Blob para validar visual end-to-end.

**Próximos passos:**
1. Rafael provisiona Postgres + Blob, passa credenciais → `.env.local`
2. `pnpm db:push` + `pnpm seed:admin` + `pnpm dev`
3. Validação visual do M4 com frame real (testar todos os 5 templates + 2 e 3 linhas + customização)
4. Ajustar pixel-perfect se algo destoar do esperado (posições, tamanhos, cores)
5. Rafael fornece SVGs definitivos (logo + florzinha)
6. Próximo módulo: **M2 — Posts Instagram**

**Bloqueios encontrados:** nenhum bloqueante.

**Decisões durante implementação:**
- Tinos via TTF direto de fonts.gstatic.com (Google Fonts repo `google/fonts` não tem `apache/tinos` mais)
- Object-form do satori em vez de JSX (type-safe, sem dependência de JSX runtime)
- Cache simples Map+TTL em vez de LRU (escala pequena, equipe de 4)
- `serverComponentsExternalPackages` para `@resvg/resvg-js` (binário nativo `.node` quebra webpack)

**Dívidas registradas:** nenhuma nova. DEC-003 resolvida e movida.

---

### Sessão 1 — 13/05/2026 — Base do Sistema + M4 (UI completa + API stub)
**O que foi feito:**
- Atualizado SPEC.md → v0.3 (M4 com 5 templates, 2 ou 3 linhas, caixas branca/roxa/verde, rotação −2.5°, florzinha, emoji 3D, limites 24/22/18)
- Atualizado ARCHITECTURE.md → v0.3 (rotas em `/imagens/m{n}-*`, Geist Sans, `/admin/usuarios`, `/api/upload` genérico)
- Registrado DEC-003 (licença Times New Roman MT) em DIVIDAS_PROJETO.md
- Scaffold Next.js 14.2.20 manual (na raiz do projeto, conviveu com `docs/` e `CLAUDE.md`)
- Stack: TypeScript strict, Tailwind, Geist Sans, Shadcn primitives manuais (Button, Input, Tooltip, Dialog, Label, Textarea), Lucide
- Auth: NextAuth Credentials + JWT + bcrypt + middleware (admin gate em `/admin/*`)
- DB: Drizzle + Vercel Postgres + schema `users` + script `seed-admin.ts` (tsx --env-file)
- Brand: `lib/brand/base.config.ts` + `lib/brand/m4.brand.ts` (fallback `serif` até DEC-003)
- Logo placeholder SVG (casinha roxa)
- Layout: AppShell + Sidebar (260px, com toggle local em "Geração de Imagens", admin item condicional) + Breadcrumb
- Componentes globais: TooltipInfo, UploadField (drag+drop + Vercel Blob client-upload), TextFieldWithCounter (com indicador de cor), DownloadButton
- Telas: /login (form completo), / (Dashboard "Bora Criar!!!"), /admin/usuarios (tabela + Dialog CRUD), placeholders M1/M2/M3/M5/Template Creator
- M4 completo (UI + dados):
  - `lib/m4/schema.ts` — Zod com refine para linha 3 condicional (v2, v4)
  - `lib/m4/templates.ts` — 5 defs com `verticalAnchorPercent`
  - `lib/m4/emojis.ts` — 30 emojis Microsoft Fluent 3D (CDN jsdelivr), 6 categorias, atalhos rápidos
  - `lib/m4/tooltips.ts` — textos exatos
  - Página + form: TemplateGrid (mini-preview por template), UploadField, 2 ou 3 TextFieldWithCounter, EmojiPicker (6 atalhos + Dialog com 30 + upload PNG próprio com validação 200KB), customização opcional, PreviewArea (estados empty/loading/ready/error)
- API routes:
  - `/api/auth/[...nextauth]` — handler
  - `/api/admin/usuarios` (GET, POST) + `/api/admin/usuarios/[id]` (PATCH, DELETE com guard de self-delete)
  - `/api/upload` — handleUpload do `@vercel/blob/client`
  - `/api/imagens/m4/render` — **STUB**: retorna `frameBlobUrl` com flag `stub: true`. TODOs marcados (Bloco-C) no código.
- **Validação:**
  - `pnpm typecheck` (via `./node_modules/.bin/tsc`) → 0 erros
  - `next build` → ✓ Compiled, 15 rotas geradas, 0 lint warnings

**O que está em progresso:**
- Aguardando Rafael provisionar Vercel Postgres + Blob para rodar `db:push`, `seed:admin` e testar auth + fluxo M4 com stub.

**Próximos passos:**
1. Rafael provisiona Postgres + Blob na Vercel, passa credenciais
2. Sessão de testes: db:push + seed:admin + dev + validar checklist
3. Resolver DEC-003 (fonte M4)
4. Rafael fornece SVG real do logo + SVG da florzinha
5. **Bloco C** — render real do M4 com Sharp + Satori (substitui o stub)

**Bloqueios encontrados:** nenhum no escopo desta sessão.

**Decisões durante implementação (registradas inline ou em docs):**
- Scaffold na raiz (Opção A) — sem subpasta `marketing-ia-charme/`
- Sidebar "Geração de Imagens" como `<button>` toggle local (não Link), conforme aprovado
- Shadcn primitives criados manualmente (`pnpm dlx shadcn` evitado para manter offline-friendly)
- `tsx --env-file=.env.local` em vez de `dotenv` dep (menos peso)

**Dívidas registradas:** DEC-003 em `DIVIDAS_PROJETO.md`.

---

### Sessão 0 — 12-13/05/2026 — Planejamento inicial
**O que foi feito:**
- SPEC.md v0.1 → v0.2 (consolidação de decisões)
- ARCHITECTURE.md v0.1 → v0.2 (stack atualizado, paleta consolidada, Vercel Hobby viável)
- CLAUDE.md v0.1 criado
- SESSION_HANDOFF.md v0.1 criado
- DIVIDAS_PROJETO.md criado (vazio)
- Decisões fechadas:
  - Paleta oficial: `#553679`, `#9569C8`, `#4CDDC3`, `#FEFEFC`
  - Fontes: Montserrat (M2, M3), Times New Roman MT (M4)
  - Logo SVG único (casinha quadrada)
  - Auth: NextAuth + Vercel Postgres + tela `/admin/usuarios`
  - Sem recuperação de senha — admin recria conta
  - Sem histórico de imagens — botão "Fazer Download" por geração
  - M1: Flux Kontext [Pro] como IA principal (sem A/B com GPT)
  - M1: fluxo simplificado — móvel vem da foto-template, sem input celular
  - M4: 3 variações posicionais (topo/centro/rodapé), dimensões 1080×1920
  - M5: placeholder via Edrone (100% a definir)
  - Estrutura de rotas: `/imagens/m{n}-*` (módulo principal + submódulos)
  - Sidebar fixa à esquerda, submódulo ativo em negrito (sem cor)
  - Dashboard: cards de módulos principais

**O que está em progresso:**
- Detalhamento do M4 + Base do Sistema (próximas sessões de planejamento)

**Próximos passos:**
1. Item 3 — Layout shell (sidebar, header, container)
2. Item 4 — Home/Dashboard
3. Item 5 — Componentes globais
4. Bloco B — Tela do submódulo M4
5. Bloco C — Especificação visual do template M4
6. Bloco D — Implementação técnica
7. Gerar GUIA_IMPLEMENTACAO.md final para Claude Code rodar

**Bloqueios encontrados:** nenhum.

---

## Template para próximas sessões

```
### Sessão N — DD/MM/AAAA — Título curto da sessão
**O que foi feito:**
- ...

**O que está em progresso:**
- ...

**Próximos passos:**
1. ...

**Bloqueios encontrados:**
- ...

**Dívidas registradas:** ver `DIVIDAS_PROJETO.md`
```
