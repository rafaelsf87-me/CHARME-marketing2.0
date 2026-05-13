# CLAUDE.md
## Contexto do Projeto para Claude Code

**Última atualização:** 13/05/2026
**Versão do projeto:** 0.2 (Pré-desenvolvimento)

---

## 1. Identidade do Projeto

**Nome:** Marketing IA Charme 2.0 — Módulo de Criação de Imagens

**Empresa:** Charme do Detalhe — e-commerce de têxteis para casa (capas para sofá e cadeira, R$20MM/ano).

**Propósito:** Sistema web interno para geração e padronização de imagens de marketing (Instagram, banners de site, thumbnails, banners de email). Usado por equipe de 2–4 pessoas, sem conhecimento técnico.

**Escala:** Sistema **interno, pequeno, não será escalado**. Foco em qualidade base, sem over-engineering.

---

## 2. Posição no Sistema Maior

Este repositório implementa **um módulo principal** dentro do sistema Marketing IA Charme 2.0:

- 🟢 **Módulo Geração de Imagens** ← este projeto
- ⚪ Módulo Geração de Copy *(futuro)*
- ⚪ Módulo Roteiros de Ads *(futuro)*
- ⚪ Módulo Geração de Ideias *(futuro)*
- ⚪ Módulo Análise de Ads *(futuro)*

**Regra arquitetural crítica:** módulos principais futuros podem viver neste mesmo monorepo ou em repos separados. **Independência total** — código de um módulo não importa código de outro.

Dentro deste módulo (Geração de Imagens) existem **submódulos**:
- **M1** Foto Produto Vitrine
- **M2** Posts Instagram
- **M3** Banners Website
- **M4** Thumbnails Feed Instagram
- **M5** Banners Email *(placeholder — a desenvolver por último)*
- **Template Creator** (painel de criação de templates customizados)

Submódulos compartilham `lib/`, `components/`, e `lib/brand/` mas suas rotas e API routes são isoladas.

---

## 3. Stack Técnico

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript (strict mode) |
| Hospedagem | Vercel (Hobby) |
| UI | Shadcn/UI + Tailwind |
| Auth | NextAuth.js (Credentials Provider) + bcrypt |
| Database | Vercel Postgres |
| Compositing | Sharp.js |
| HTML → PNG | Satori + resvg-js |
| IA M1 (Foto Produto) | Flux Kontext [Pro] via fal.ai |
| IA M3 (Banner) | GPT Image 2 (OpenAI) |
| Storage temporário | Vercel Blob |

**Detalhes completos:** ver `ARCHITECTURE.md`.

---

## 4. Convenções de Código

### TypeScript
- `strict: true` no `tsconfig.json`
- Interfaces > types para objetos de domínio
- Sem `any` — se necessário, justificar com comentário

### React / Next.js
- App Router (sem `pages/`)
- Server Components por padrão; `"use client"` apenas onde necessário (interação)
- Server Actions para mutations simples; API routes para fluxos complexos
- Lazy loading por rota (já é nativo no App Router)

### Estilo de código
- Prettier + ESLint padrão Next.js
- Imports ordenados: builtin → external → internal (`@/`)
- Componentes em PascalCase, hooks em camelCase com prefixo `use`
- Nomes em **português** para domínio de negócio (campos, labels, rotas); **inglês** para código genérico (utils, types base, props)

### Estrutura de arquivos
Ver `ARCHITECTURE.md` seção 5.

### Tooltips
**Todo campo de input** tem componente `TooltipInfo` ao lado. Texto exato vem da `SPEC.md` — não inventar.

---

## 5. Regras Arquiteturais Críticas

1. **Brand config é fonte única de verdade.** Nunca hardcodar cor hex ou nome de fonte em componente. Sempre importar de `lib/brand/`.

2. **Submódulos são independentes.** Código de `app/imagens/m4-thumbnails/` nunca importa código de `app/imagens/m2-posts/`. Compartilhamento só via `lib/` e `components/`.

3. **Templates default são imutáveis em runtime.** Só alteráveis via código (PR). Custom templates (criados via Template Creator) ficam em `templates/custom/`.

4. **IA só onde compositing não resolve.** M2 e M4 são puramente Sharp.js/Satori. M1 usa Flux Kontext. M3 usa GPT Image 2.

5. **Sem histórico de imagens geradas.** Cada geração tem botão "Fazer Download" e a imagem é descartada. Vercel Blob usado apenas como buffer temporário.

6. **Autenticação obrigatória.** Todas as rotas exceto `/login` são protegidas por middleware. Rotas `/admin/*` exigem `role === 'admin'`.

---

## 6. Padrões de Trabalho com Claude Code

### Ordem de implementação
1. Base do sistema (auth, layout, brand config)
2. M4 Thumbnails *(primeiro submódulo — valida stack)*
3. M2 Posts *(maior ROI)*
4. M1 Foto Produto *(maior complexidade)*
5. M3 Banners
6. Template Creator
7. M5 Banners Email *(a especificar)*

### Fluxo por feature
1. Ler `SPEC.md` e `GUIA_IMPLEMENTACAO.md` da feature em questão
2. Verificar pendências e dívidas em `DIVIDAS_PROJETO.md`
3. Implementar
4. Atualizar `SESSION_HANDOFF.md` ao final da sessão
5. Registrar bugs/melhorias descobertas em `DIVIDAS_PROJETO.md`

### Commits
- Mensagens em português
- Formato: `feat(m4): adicionar template v1-topo` ou `fix(auth): corrigir middleware`
- Branches: `feat/m4-thumbnails`, `fix/login`, etc.

### Reviews
- Rafael pode pedir manualmente revisões com slash commands específicos (ex: `/reviews`, `/design-reviews`) — aguardar instrução
- Não rodar revisões automáticas sem pedido

---

## 7. O Que NÃO Fazer

- ❌ Não criar testes automatizados extensivos. Sistema interno, equipe pequena — testes manuais via use-cases reais. Apenas testes unitários para funções críticas de render (Sharp/Satori) e validação de inputs.
- ❌ Não adicionar bibliotecas pesadas sem justificar. Cada dependência é peso de deploy.
- ❌ Não criar abstrações antecipadas. Implementar o caso concreto primeiro, abstrair só quando o terceiro caso aparecer.
- ❌ Não inventar UX. Se não estiver claro na `SPEC.md`, perguntar.
- ❌ Não usar mock data em produção. Se faltar dado real, criar issue em `DIVIDAS_PROJETO.md` e pausar.
- ❌ Não criar histórico/logs de imagens geradas (decisão de produto — sem persistência).

---

## 8. Documentos do Projeto

| Doc | Conteúdo |
|---|---|
| `CLAUDE.md` | Este arquivo — contexto e convenções pro Claude Code |
| `SPEC.md` | Especificação funcional completa de cada submódulo |
| `ARCHITECTURE.md` | Stack, estrutura de pastas, brand config, decisões técnicas |
| `GUIA_IMPLEMENTACAO.md` | Passo a passo de implementação, padrões de API, setup local |
| `SESSION_HANDOFF.md` | Estado por sessão — atualizar ao final de cada sessão de dev |
| `DIVIDAS_PROJETO.md` | Bugs, melhorias e features pendentes — log vivo |

**Antes de começar qualquer trabalho:** ler `SESSION_HANDOFF.md` para entender o estado atual e `DIVIDAS_PROJETO.md` para evitar reintroduzir problemas conhecidos.

---

## 9. Contato e Decisões

**Product Owner / Decisor único:** Rafael Freitas (CEO)
- Decide UX, prioridades, escopo
- Atua diretamente em marketing, CRM, automação — nível avançado
- Estilo: direto, objetivo, sem floreio, foco em ROI

**Quando travar:** parar, registrar dúvida em `SESSION_HANDOFF.md` na seção "Bloqueios", e aguardar resposta. Não assumir contexto.
