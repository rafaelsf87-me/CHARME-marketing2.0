# ARCHITECTURE.md
## Marketing IA Charme 2.0 — Módulo: Criação de Imagens
**Versão:** 0.2 (Planejamento — sessão de consolidação)
**Data:** 13/05/2026
**Status:** Pré-desenvolvimento — pendências reduzidas, M4 pronto para detalhamento

---

## 1. Contexto do Projeto

### Empresa
- **Charme do Detalhe** — e-commerce de têxteis para casa (R$20MM/ano)
- Produtos: capas para sofá e cadeira (estampadas e lisas), produção própria + importação China
- Equipe de marketing: 2–4 pessoas operando o sistema

### Posição deste módulo no sistema maior
Este projeto é o **Módulo de Criação de Imagens** do sistema **Marketing IA Charme 2.0**.
É o **primeiro módulo** de um sistema que no futuro receberá módulos independentes adicionais, como:
- Criação de Copies e Conteúdos
- Roteiros de Ads e Conteúdo
- Geração de Ideias
- Análise de Ads
- Outros (a definir)

**Regra arquitetural crítica:** cada módulo é **totalmente independente**. Nenhuma alteração neste módulo deve quebrar, depender ou interferir em módulos futuros. Isso vale também para novos desenvolvedores que entrarem no projeto — cada um trabalha no seu módulo de forma isolada.

### Submódulos do Módulo Criação de Imagens
1. **M1 — Foto Produto Vitrine**
2. **M2 — Posts Instagram**
3. **M3 — Banners Website**
4. **M4 — Thumbnails Feed Instagram**
5. **M5 — Banners Emails** *(placeholder — a desenvolver por último)*
+ **Template Creator** (painel de criação de templates customizados)

---

## 2. Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | Nativo Vercel, TypeScript, API routes, lazy loading por rota |
| Linguagem | **TypeScript** | Padronização, manutenção, escalabilidade |
| Hospedagem | **Vercel** (Hobby pode atender — ver seção 3) | |
| Component Library | **Shadcn/UI** | Leve, acessível, padrão de mercado, sem overhead |
| Auth | **NextAuth.js** ou similar (a definir na implementação) | Login + senha multi-user |
| Compositing/imagem | **Sharp.js** | M2, M4 — overlay texto/imagem server-side, zero custo de API |
| HTML → PNG | **Satori + resvg-js** | Render de templates HTML/CSS para PNG, roda em Vercel Edge |
| **IA Imagem M1** | **Flux Kontext [Pro]** (via fal.ai) | Edit-by-reference com preservação de regiões não-editadas — ideal para "muda estampa, mantém o resto" |
| IA Imagem M3 | **GPT Image 2** (OpenAI) | Ajuste de pose da atriz e composição do banner |
| Upload de arquivos | **Vercel Blob** | Nativo Vercel, simples, sem configuração extra |
| Brand config | **JSON/TS centralizado** | Cores, fontes, dimensões — fonte única de verdade |

### Decisões técnicas relevantes

**M1 — Flux Kontext escolhido (v0.2):**
- Caso de uso é "substituir estampa, manter móvel + ambiente exatos" — Flux Kontext é o modelo natural para isso
- Preserva regiões não-editadas melhor que GPT Image 2
- Latência ~8s (cabe em Vercel Hobby — 10s timeout)
- Custo fixo de ~$0.04/imagem
- **Sem A/B test com GPT** — decisão fechada na fase de planejamento

**M3 — GPT Image 2:**
- Atualizado de GPT-4o Image Edit (v0.1) para GPT Image 2 (modelo atual)
- Usado para ajustes de pose da atriz antes de compor no banner final

**M2 e M4 — Compositing puro:**
- Sem IA de geração — Sharp/Satori renderizam template HTML/CSS com variáveis
- Elimina "cara de IA", reduz custo a zero, garante consistência

**Princípio geral:** IA só é chamada quando compositing puro não resolve.

---

## 3. Hospedagem — Vercel

### Planos
| Plano | Timeout Serverless | Custo | Quando usar |
|---|---|---|---|
| **Hobby (grátis)** | 10s | $0 | M1 (Flux ~8s), M2, M3 (curtos), M4 — todos os módulos atuais |
| Pro | 60s | $20/mês/membro | Só se M3 com GPT Image 2 estourar 10s em produção |

### Estratégia de ativação (atualizada v0.2)
- **Iniciar e manter em Hobby** — agora viável porque Flux Kontext do M1 cabe em 10s
- **Avaliar Pro apenas quando M3 entrar em produção** e for confirmado se GPT Image 2 estoura 10s
- Não existe plano de $7 no Vercel — Hobby ou Pro são as opções

**Economia vs v0.1:** $20/mês potenciais (Pro deixa de ser obrigatório desde o início).

---

## 4. Autenticação

### Modelo
- **Multi-user** com **login + senha** por usuário
- Cada operador da equipe de marketing (2–4 pessoas) tem credenciais próprias
- Não é acesso aberto via URL pública

### Stack sugerida (a confirmar na implementação)
- **NextAuth.js** (Credentials Provider) ou similar
- Persistência: tabela `users` em DB leve (Vercel Postgres, Turso, ou Supabase)
- Sessão: JWT em cookie httpOnly
- Sem cadastro público — usuários são criados manualmente por admin

### Fluxo
1. `/login` — formulário de login
2. Validação → cria sessão
3. Rotas dos módulos protegidas por middleware
4. Logout disponível no header

---

## 5. Estrutura de Pastas

```
marketing-ia-charme/
│
├── app/                              # Rotas Next.js (App Router)
│   ├── page.tsx                      # Home / Dashboard de módulos
│   ├── login/                        # Tela de login
│   │   └── page.tsx
│   ├── m1-produto-vitrine/           # Módulo 1: Foto Produto
│   │   └── page.tsx
│   ├── m2-posts-insta/               # Módulo 2: Posts e Carrosséis Instagram
│   │   └── page.tsx
│   ├── m3-banners-site/              # Módulo 3: Banners Website
│   │   └── page.tsx
│   ├── m4-thumbnails-feed/           # Módulo 4: Thumbnails Vídeo Instagram
│   │   └── page.tsx
│   ├── m5-banners-email/             # Módulo 5: Banners Email (placeholder)
│   │   └── page.tsx
│   └── template-creator/             # Painel de criação de templates
│       ├── m2-layouts/               # Sub 1: Templates para M2
│       ├── m3-layouts/               # Sub 2: Templates para M3
│       ├── m4-layouts/               # Sub 3: Templates para M4
│       ├── m5-layouts/               # Sub 4: Templates para M5 (placeholder)
│       └── m1-ambientes/             # Sub 5: Cenários de ambiente para M1
│
├── api/                              # API Routes Next.js
│   ├── auth/                         # Endpoints de autenticação
│   │   └── [...nextauth]/route.ts
│   ├── m1/
│   │   └── generate/route.ts
│   ├── m2/
│   │   └── render/route.ts
│   ├── m3/
│   │   └── render/route.ts
│   ├── m4/
│   │   └── render/route.ts
│   ├── m5/                           # placeholder
│   │   └── render/route.ts
│   └── template-creator/
│       └── analyze/route.ts
│
├── lib/                              # Lógica compartilhada
│   ├── auth/
│   │   └── config.ts                 # Configuração NextAuth
│   ├── brand/
│   │   ├── base.config.ts            # Cores hex, logo — FONTE ÚNICA (nunca duplicar)
│   │   ├── m1.brand.ts               # Estende base: specs M1
│   │   ├── m2.brand.ts               # Estende base: fontes e specs M2
│   │   ├── m3.brand.ts               # Estende base: fontes e specs M3
│   │   ├── m4.brand.ts               # Estende base: fontes e specs M4
│   │   └── m5.brand.ts               # placeholder
│   ├── sharp-compose.ts              # Funções de compositing (M2, M4)
│   ├── template-engine.ts            # Render HTML/CSS → PNG via Satori
│   ├── flux-image.ts                 # Client Flux Kontext (fal.ai) — M1 principal
│   ├── openai-image.ts               # Client GPT Image 2 — M3
│   └── storage.ts                    # Vercel Blob: upload, read, delete
│
├── templates/                        # Templates visuais
│   ├── defaults/                     # Hard-coded, IMUTÁVEIS pelo usuário
│   │   ├── m2-post/
│   │   │   ├── v1/                   # Variação 1 de layout
│   │   │   ├── v2/
│   │   │   └── v3/
│   │   ├── m2-carousel/
│   │   │   ├── v1/
│   │   │   ├── v2/
│   │   │   └── v3/
│   │   ├── m3-banner-desktop/
│   │   │   ├── v1/
│   │   │   ├── v2/
│   │   │   └── v3/
│   │   ├── m3-banner-mobile/
│   │   │   ├── v1/
│   │   │   ├── v2/
│   │   │   └── v3/
│   │   ├── m4-thumbnail/
│   │   │   ├── v1-topo/              # Bloco de texto no topo
│   │   │   ├── v2-centro/            # Bloco de texto centralizado
│   │   │   └── v3-rodape/            # Bloco de texto no rodapé
│   │   ├── m5-email/                 # placeholder
│   │   └── m1-ambientes/
│   │       ├── sofa-1/               # Cenário sofá pré-aprovado
│   │       ├── sofa-2/
│   │       ├── sofa-3/
│   │       ├── cadeira-1/
│   │       ├── cadeira-2/
│   │       └── cadeira-3/
│   └── custom/                       # Criados via Template Creator
│       ├── m2/                       # Templates custom M2
│       ├── m3/                       # Templates custom M3
│       ├── m4/                       # Templates custom M4
│       ├── m5/                       # placeholder
│       └── m1-ambientes/             # Ambientes custom M1
│
├── components/                       # Componentes React reutilizáveis
│   ├── ui/                           # Shadcn/UI base
│   ├── auth/                         # Componentes de auth (LoginForm, etc)
│   ├── upload-field.tsx              # Campo de upload com tooltip
│   ├── text-field-exact.tsx          # Campo "Texto a Risca"
│   ├── text-field-prompt.tsx         # Campo "Customização / Ideia"
│   ├── template-selector.tsx         # Seletor visual de template
│   ├── download-button.tsx           # Botão "Fazer Download" pós-geração
│   └── tooltip-info.tsx              # Componente "?" padrão do sistema
│
├── public/
│   └── brand/                        # Logo SVG, assets estáticos da marca
│       └── logo.svg                  # Logo único (casinha quadrada)
│
├── docs/                             # Documentação do projeto
│   ├── CLAUDE.md
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   ├── GUIA_IMPLEMENTACAO.md
│   ├── SESSION_HANDOFF.md
│   └── DIVIDAS_PROJETO.md
│
├── .env.local                        # Chaves de API (nunca commitar)
└── package.json
```

---

## 6. Brand Config — Arquitetura

### Princípio
Existe **uma única fonte de verdade** para a identidade visual. Nunca hardcodar cor ou fonte diretamente em componente.

### Paleta oficial consolidada (v0.2)

```typescript
// lib/brand/base.config.ts — BASE (compartilhada por todos os módulos)
export const brandBase = {
  colors: {
    primaryDark:  "#553679",   // Roxo escuro — primária, títulos M4
    primaryLight: "#9569C8",   // Roxo claro — secundária
    cta:          "#4CDDC3",   // Verde — CTA, títulos M2, detalhes M4
    white:        "#FEFEFC",   // Branco — textos sobre fundo escuro
  },
  logo: "/brand/logo.svg",     // SVG único, casinha quadrada
  name: "Charme do Detalhe",
  socialHandle: "@charmedodetalhe",
}
```

### Brand por módulo

```typescript
// lib/brand/m1.brand.ts — M1 não usa texto nem paleta de marca
import { brandBase } from './base.config'
export const brandM1 = {
  ...brandBase,
  dimensions: {
    fotoCapa:     { width: 1080, height: 1080 },
    fotoAmbiente: { width: 1080, height: 1080 },
    fotoElastico: { width: 1080, height: 1080 },
  }
}

// lib/brand/m2.brand.ts
import { brandBase } from './base.config'
export const brandM2 = {
  ...brandBase,
  fonts: {
    title: "Montserrat",
    body:  "Montserrat",
    cta:   "Montserrat",
  },
  textColors: {
    title:  brandBase.colors.cta,       // #4CDDC3
    body:   brandBase.colors.white,     // #FEFEFC
  },
  footer: {
    logo:   brandBase.logo,
    handle: brandBase.socialHandle,
  },
  dimensions: {
    post:     { width: 1080, height: 1080 },
    carousel: { width: 1080, height: 1080 },
  }
}

// lib/brand/m3.brand.ts
import { brandBase } from './base.config'
export const brandM3 = {
  ...brandBase,
  fonts: {
    title: "Montserrat",
    body:  "Montserrat",
  },
  // Cores: definidas no template ou pela cor-tema da campanha (sem paleta fixa)
  dimensions: {
    desktop: { width: 0, height: 0 },   // TBD — aguardando time
    mobile:  { width: 0, height: 0 },   // TBD — aguardando time
  }
}

// lib/brand/m4.brand.ts
import { brandBase } from './base.config'
export const brandM4 = {
  ...brandBase,
  fonts: {
    text: "Times New Roman MT",
  },
  palette: {
    boxLine1: brandBase.colors.primaryDark,  // #553679
    boxLine2: brandBase.colors.cta,          // #4CDDC3
    text:     brandBase.colors.white,        // #FEFEFC
  },
  dimensions: {
    thumbnail: { width: 1080, height: 1920 },  // 9:16
  }
}

// lib/brand/m5.brand.ts — placeholder
import { brandBase } from './base.config'
export const brandM5 = {
  ...brandBase,
  // TBD
}
```

**Status:** todas as cores e fontes definidas (exceto M5 — placeholder).

---

## 7. Gestão de Templates

### Regras
| Tipo | Origem | Editável | Excluível |
|---|---|---|---|
| Default | Hard-coded no repositório | Não (apenas via código) | Não |
| Custom | Criado via Template Creator | Não | Sim (individual ou "Limpar tudo") |

### "Limpar tudo"
- Botão com confirmação explícita: *"Isso vai excluir TODOS os templates criados. Não pode ser desfeito."*
- Zera 100% de `/templates/custom/` em todos os submódulos
- **Não afeta** `/templates/defaults/`
- Objetivo: garantir integridade e limpeza de memória do sistema

---

## 8. Histórico e Persistência

### Decisão (v0.2)
- **Sem histórico** de imagens geradas
- Cada geração disponibiliza botão **"Fazer Download"** para o usuário salvar localmente
- Imagem descartada após download (ou após X minutos de timeout — a definir na implementação)
- Cada sessão é independente

### Implicações
- Sem necessidade de DB para imagens
- Vercel Blob usado apenas como buffer temporário durante a geração
- Reduz complexidade e custo de storage

---

## 9. Frontend — Diretrizes Técnicas

- **Lazy loading por módulo**: cada rota (`/m1-produto-vitrine`, `/m2-posts-insta`, etc.) carrega apenas seus próprios assets. Nenhum módulo importa código de outro.
- **Transições de aba sem reload** (Next.js App Router por padrão)
- **Componentes Shadcn/UI**: padrão de mercado, leve, acessível
- **Código otimizado**: sem imports desnecessários, sem bibliotecas pesadas
- **Design**: ferramenta profissional — limpo, claro, intuitivo. Não é dashboard complexo, é uma ferramenta de uso diário por pessoas não-técnicas.
- **Tooltips "?"**: presentes em TODO campo de input do sistema. Texto de cada tooltip definido na SPEC.md por módulo.

### Campos padrão reutilizáveis
Dois componentes globais de texto (usados em M2, M3, M4, M5 — não em M1):

**Campo 1 — Customização / Ideia**
- Input livre, sem restrição
- A IA usa como instrução para ajustes visuais dentro do template
- Tooltip: *"Descreva ajustes visuais livres. Ex: 'atriz comemorando, fundo festivo'. A IA não sai do template base."*

**Campo 2 — Textos a Risca**
- Um sub-campo por zona de texto do template (ex: Título, Subtítulo, CTA, Rodapé)
- Texto exato que aparecerá na imagem — sem alteração pela IA
- Tooltip por sub-campo: definido na SPEC.md conforme template

---

## 10. Estimativa de Custo Mensal (atualizada v0.2)

| Item | Custo estimado |
|---|---|
| Vercel Hobby | $0/mês |
| Vercel Pro (só se necessário pro M3) | $0–$20/mês |
| Flux Kontext Pro — M1 (9–18 imagens) | ~$0.40–0.75/mês |
| GPT Image 2 — M3 (estimativa baixa) | ~$2–8/mês (depende do tier de qualidade) |
| M2 e M4 (compositing puro) | $0 |
| Vercel Blob (buffer temporário) | ~$0–2/mês |
| **Total estimado** | **~$3–30/mês** |

**Economia vs v0.1 (~$35–45):**
- Flux mais barato e previsível que GPT-4o Image Edit no M1
- Vercel Hobby viável (era Pro obrigatório)
- Sem histórico = sem custo de storage permanente

### Volume base
- M1: 9–18 imagens/mês (3–6 produtos × 3 fotos)
- M2: 30–120 posts/mês (1–4/dia)
- M3: ~2–4 banners/campanha, ~1–2 campanhas/mês
- M4: volume variável (baixo)
- M5: TBD

---

## 11. Documentos do Projeto

| Arquivo | Conteúdo |
|---|---|
| `CLAUDE.md` | Contexto do projeto para o Claude Code. Convenções de código, como trabalhar neste repositório, posição no sistema maior. |
| `SPEC.md` | Especificação funcional completa: todos os módulos, fluxos, inputs, outputs, tooltips, regras de negócio. |
| `ARCHITECTURE.md` | Arquitetura técnica: stack, estrutura de pastas, brand config, decisões técnicas. |
| `GUIA_IMPLEMENTACAO.md` | Ordem de implementação, decisões técnicas, padrões de API, como configurar ambiente local. |
| `SESSION_HANDOFF.md` | Estado atual a cada sessão de desenvolvimento: o que foi feito, o que está em progresso, próximos passos, bloqueios. |
| `DIVIDAS_PROJETO.md` | Bugs conhecidos, melhorias pendentes, features futuras (não implementar agora — registrar para não perder). |

---

## 12. Pendências Abertas

### Resolvidas nesta versão (v0.2)
- [x] Cores hex da marca — consolidadas (`#553679`, `#9569C8`, `#4CDDC3`, `#FEFEFC`)
- [x] Fontes por módulo — definidas (M5 pendente)
- [x] Logo — SVG único confirmado (casinha quadrada)
- [x] Autenticação — login + senha por usuário
- [x] Histórico — sem histórico, botão download
- [x] M1 IA — Flux Kontext [Pro] decidido (sem A/B)
- [x] M1 dimensões — 1080×1080
- [x] M4 variações — topo / centro / rodapé
- [x] M4 dimensões — 1080×1920

### Bloqueantes restantes
- Nenhum para iniciar detalhamento do M4

### Pendências por implementação
- [ ] **M3:** dimensões exatas desktop e mobile — aguardando time
- [ ] **M1:** confirmação visual das 6 fotos-template (ajuste do Sofá 2)
- [ ] **M1:** refinamento dos prompts base (fase de treinamento)
- [ ] **M5:** 100% a definir (placeholder)

---

## 13. Ordem de Implementação

| Fase | Módulo | Motivo |
|---|---|---|
| 1 | Brand config + estrutura base + Auth | Base para tudo |
| 2 | **M4 Thumbnails** | Mais simples, valida stack e deploy no Vercel |
| 3 | **M2 Posts** | Maior ROI imediato (alto volume, custo zero, libera equipe) |
| 4 | **M1 Foto Produto** | Maior complexidade técnica — Flux Kontext + 6 cenários |
| 5 | **M3 Banners** | Aproveita aprendizado do M1 + GPT Image 2 |
| 6 | **Template Creator** | Depende dos outros módulos funcionando |
| 7 | **M5 Banners Emails** | Último — a especificar antes de iniciar |

---

## 14. Changelog

### v0.2 — 13/05/2026 (sessão de consolidação)
- **Brand:** paleta consolidada e padronizada com cores oficiais do site
- **Brand:** logo SVG único confirmado
- **Stack:** Flux Kontext [Pro] como IA principal do M1 (sem A/B com GPT)
- **Stack:** GPT Image 2 (atualizado de GPT-4o Image Edit) usado no M3
- **Vercel:** Hobby agora atende todos os módulos (era Pro obrigatório pro M1)
- **Auth:** seção nova — multi-user com login + senha
- **Histórico:** confirmado sem histórico, botão download por geração
- **Brand config:** todos os módulos com cores/fontes/dimensões definidas (exceto M5)
- **Estrutura:** adicionado M5 placeholder em todas as camadas (app, api, lib, templates)
- **Custo:** estimativa atualizada — redução significativa (~$35–45 → ~$3–30)
- **M4:** ordem de templates default formalizada (topo/centro/rodapé)
- **M1:** removida menção a input "foto do móvel sem capa"

### v0.1 — 12/05/2026
- Versão inicial do planejamento
