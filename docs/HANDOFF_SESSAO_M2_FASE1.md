# HANDOFF — Sessão M2 Fase 1

**Sessão:** M2 Fase 1 + Adendo + Iteração v5
**Data:** 18/05/2026
**Status:** ✅ ENTREGUE — T1 Atual_Maio26 em prod (commit `9c32313`)
**Próxima fase:** M2 Fase 2 — wireframes T2 Atual_Maio26_New (Pipeline Híbrido)

---

## 1. Estado final entregue

**Commit:** `9c32313 feat(m2): fase 1 fechada — T1 prompt v5 (anti-handle + bg enforcement + hierarquia strict)`
**Push:** `origin/main` em 18/05/2026
**URL prod:** Vercel auto-deploy a partir de `main`

### O que está em prod
- **Rota `/imagens/m2-posts`** com 2 abas (Imagem Única + Carrossel) e 3 templates (T1 ativo, T2/T3 placeholder).
- **T1 (Atual_Maio26)** = `fal-prompt-puro` via `fal-ai/gpt-image-1` tier `high` (~$0.19/img).
- **Schema Zod** com `discriminatedUnion('modo')` + `superRefine` validando regras de upload obrigatório.
- **API** `/api/imagens/m2/generate` (POST, auth obrigatório, maxDuration 300s, paralelização via Promise.all).
- **Pipeline pós-FAL:** Sharp resize 1024×1536 → 1080×1350 (4:5 portrait).

### 14 mudanças do Adendo aplicadas + 5 mudanças de remoção do footer + 3 reforços v5

**Adendo (Fase 1 base):**
1. Schema com `M2_LOGO_OPTIONS`, `M2_MODO_GERACAO`, `instrucoesUsoImagens`
2. `brandM2.logos` config + `maxReferenceImages: 8`
3. `BuildPromptArgs.instrucoesUsoImagens`
4. T1 `quality: 'high'`
5. T1 prompt v2 (TEXT FIDELITY + TYPOGRAPHIC HIERARCHY + DENSITY + FOOTER RESERVATION 100px)
6. `lib/m2/footer-gen.ts` (Sharp + SVG inline; retangular omite handle)
7. `lib/m2/post-process.ts` com `postProcessImage({inputUrl, logoOption})`
8. `lib/m2/render.ts` propaga `logoOption` + `instrucoesUsoImagens`
9. `<logo-selector>` (4 miniaturas, button+aria-pressed)
10. `<modo-geracao-selector>` (toggle binário, button+aria-pressed)
11. Form imagem-única: layout 2 colunas + blocos condicionais IA/Upload
12. Form carrossel: idem + bloco "Instruções globais" no upload
13. `<png-upload-list>` com `maxSlots` dinâmico (3 IA / 8 Upload), `firstRequired`
14. Smoke scripts atualizados (tier high)

**Iteração v3 (após smoke 1):**
- Prompt: STYLE REFERENCE + VISUAL STYLE AVOID (anti flat cartoon) + FOOTER RESERVATION 180px
- Footer-gen: constantes 120/60/40 (era 100/56/24)
- Copy do smoke reestruturado com `\n` separando título dos bullets

**Remoção do footer T1 (após smoke 2 — decisão Rafael):**
- Bloco FOOTER RESERVATION removido do prompt
- `postProcessImage` simplificada pra `resizeTo1080x1350(inputUrl)`
- `logoOption` removido da propagação em `render.ts`
- `lib/m2/footer-gen.ts` mantido com comentário "Used by Pipeline Híbrido (T2/T3). Not active in T1."
- `LogoSelector` condicional: `{templateId !== 'atual-maio26' && <LogoSelector ... />}`

**3 reforços v5 (sem novo smoke):**
- BACKGROUND ENFORCEMENT: força gradient cyan→roxo em 100% do canvas
- NO BRAND ELEMENTS: bloqueia IA de inventar `@charmedodetalhe`/handle
- TYPOGRAPHIC HIERARCHY STRICT: title ≤25% canvas, body 35-45% do title

### Smokes rodados nesta sessão

| # | Tipo | Custo | Output | Resultado |
|---|---|---|---|---|
| 1 | imagem-única medium (sessão anterior) | $0.063 | FAL URL | ❌ português quebrado, flat cartoon |
| 2 | imagem-única high v2 | $0.19 | FAL URL | ⚠️ português OK + footer colado + flat cartoon |
| 3 | imagem-única high v3 | $0.19 | FAL URL | ✅ estilo 3D OK + sparkles OK + footer ainda invade |
| 4 | carrossel 3 slides high (sem footer overlay) | $0.57 | 3 FAL URLs | ✅ paralelização OK + CTA só no slide 3 + estilo consistente |

**Total gasto na sessão:** ~$0.95.
**Smokes locais não conseguiram subir pro Vercel Blob** (store local privado — esperado). FAL retornou URLs públicas válidas por horas.

---

## 2. Decisões importantes (fechadas)

| ID | Decisão | Status |
|---|---|---|
| [DEC-M2-001] | Tier T1 = `high` (~$0.19/img, ~$4.80-$22.80/mês) | ✅ RESOLVIDA |
| [DEC-M2-002] | Modo Upload pra resolver erros físicos de geração IA | ✅ RESOLVIDA |
| [DEC-M2-003] | T1 sem footer programático (réplica fiel do ChatGPT Plus) | ✅ RESOLVIDA |
| [LIMIT-M2-001] | T1 tem limitações inerentes do gpt-image-1 — ACEITAS como trade-off | ⚠️ ACEITA |
| [REF-M2-001] | Vercel Blob store privado legado (smokes locais) | 🟡 NÃO-BLOQUEANTE |
| [REF-M2-002] | Footer overlay (`footer-gen.ts` + `LogoSelector`) inativo no T1 | 🟡 ATIVAÇÃO PREVISTA NO T2 |

### Outras decisões registradas no adendo (não-mudaram)
- **4 logos** prontos em `public/brand/m2/logos/` (casinha default, quadrado, 3d, retangular) — serão consumidos pelo T2 quando entrar.
- **Dimensão 1080×1350** (4:5 portrait Instagram) substitui 1080×1080 da SPEC ≤v1.5.
- **Carrossel 2-8 slides** (era 3-5).
- **CTA final** como campo separado, anexado ao copy do último slide com instrução "display prominently".

---

## 3. Decisões adiadas

| Item | Quem decide | Quando |
|---|---|---|
| Direção do T2 (Atual_Maio26_New) | Rafael | Fase 2 — após wireframes (próxima sessão) |
| Direção do T3 (Novo_Teste1) | Rafael | Fase 5 — após smoke T1+T2 |
| Validação manual prod do T1 | Rafael | Imediato — após deploy Vercel concluir |
| Quando virar M3 (Banners Website) | Rafael | Próximo módulo após Fase 5 do M2 |
| Especificação M5 (Banners Email) | Rafael | Sessão futura dedicada |
| Especificação M6 (Imagens Ads) | Rafael | Sessão futura dedicada |

---

## 4. Pendências pra Rafael

1. **Validação manual em prod** (alta prioridade — destrava M2 Fase 2):
   - Gerar 1 imagem-única real via UI com copy do dia-a-dia (estampa, oferta, novidade)
   - Gerar 1 carrossel 3-5 slides real via UI com CTA final
   - Tentar modo Upload com 2-3 PNGs reais (foto sofá, foto produto)
   - Reportar: estilo aceitável? hierarquia legível? handles inventados aceitos? Trade-offs do [LIMIT-M2-001] toleráveis?

2. **Definir direção T2 (Fase 2 — wireframes):**
   - Já decidido: Pipeline Híbrido Sharp/Satori. IA gera elementos isolados, layout/tipografia/footer 100% determinísticos.
   - Falta: wireframes SVG/HTML mockup dos N tipos de slide (capa, meio, CTA?) pra aprovar antes de Fase 3 implementação.

3. **Confirmar deleção do `IMPL_M2_FASE1_ADDENDUM.md`** (já não é necessário, conteúdo aplicado e documentado).

---

## 5. Próximo passo — Fase 2 (wireframes T2)

**Objetivo:** Definir layouts pixel-precisos do T2 Atual_Maio26_New (Pipeline Híbrido) em wireframes SVG/HTML aprovados pelo Rafael ANTES de qualquer código.

**Entregáveis Fase 2:**
- Wireframes dos N tipos de slide (capa única vs slide de meio vs slide CTA?)
- Definição de quais elementos a IA gera (produto isolado, atriz, ícones) vs Sharp/Satori (background gradient, textos, footer com `LogoSelector`)
- Especificação de variáveis injetáveis em cada slot (foto produto, copy título, copy body, CTA, etc.)
- Brand consistency: como manter homogeneidade visual entre slides do mesmo carrossel (sem variar sofá/produto entre slides)

**Quando começar Fase 2:** após validação manual prod do T1 + brief do Rafael.

---

## 6. Arquivos-chave da entrega

```
app/imagens/m2-posts/
├── page.tsx
└── _components/
    ├── m2-form.tsx
    ├── tab-switcher.tsx
    ├── template-selector.tsx
    ├── modo-geracao-selector.tsx
    ├── logo-selector.tsx                # T2/T3 only
    ├── form-imagem-unica.tsx
    ├── form-carrossel.tsx
    ├── slide-block.tsx
    ├── png-upload-list.tsx              # maxSlots dinâmico
    ├── preview-imagem-unica.tsx
    └── preview-carrossel.tsx

app/api/imagens/m2/
└── generate/route.ts                    # POST handler, auth + Zod parse + renderM2

lib/brand/
└── m2.brand.ts                          # 1080×1350, Montserrat, logos, gradient

lib/m2/
├── schema.ts                            # discriminatedUnion + superRefine
├── fal-client.ts                        # gpt-image-1 wrapper
├── post-process.ts                      # Sharp resize 1080×1350
├── footer-gen.ts                        # Used by T2/T3 (inativo no T1)
├── render.ts                            # Orquestrador Promise.all
└── templates/
    ├── index.ts
    ├── types.ts
    ├── atual-maio26/                    # T1 ativo
    ├── atual-maio26-new/                # T2 placeholder
    └── novo-teste-1/                    # T3 placeholder

public/brand/m2/logos/                   # 4 PNGs (casinha, quadrado, 3d, retangular)

scripts/
├── smoke-m2-imagem-unica.ts             # tier high, casinha, ia
└── smoke-m2-carrossel.ts                # tier high, casinha, ia, 3 slides
```

---

## 7. Validação técnica final

- ✅ `pnpm typecheck` verde
- ✅ `pnpm lint` zero warnings
- ✅ `pnpm build` verde (rota `/imagens/m2-posts` = 16.1 kB)
- ✅ Commit + push em `main` sem hooks bloqueando
- ✅ Working tree limpo após cleanup dos duplicates macOS

---

**FIM HANDOFF M2 FASE 1.**

---

## Sessão final M2 V1 (18/05/2026)

Esta seção fecha o ciclo M2 V1 — entrega completa de Fase 1 + hotfixes + investigação T2.

### Hotfixes aplicados pós-Fase 1

- **v6** (commits `9d469a3`, `136d32a`): reference image gradient base como anchor de fundo + safe area 60px + UI fixes (modo geração `w-fit`, descrição truncada, preview pós-geração, pipeline T1 migrado pra edit-image sempre). Ver [FIX-M2-002].
- **v8** (commits `fd406e9`, `d25a255`): revisor de fundo via retry automático (`background-check.ts` + `generateWithBgCheck`, max 2 attempts) + remoção da estratégia de reference image (causava lavagem do gradient) + mudanças UX J/K (CTA dentro do copy do último slide, slides collapsed por default com badges). Ver [FIX-M2-003].

### Investigação de modelos IA pro T2 (encerrada)

3 modelos testados via FAL — todos reprovaram fidelidade de texto pt-BR. Detalhes completos em [INV-M2-001]:
- **Recraft V3** ($0.04): brand ignorado, texto destruído, hard limit 1000 chars no prompt
- **Flux Pro 1.1 Ultra** ($0.06 + 2 retries falsos-NSFW): brand OK, texto alucinado, inventou domínio fake
- **Ideogram V3 QUALITY** ($0.10): brand OK, mas renderizou trechos do **prompt** em vez do copy

**Custo investigação:** $0.32. **Conclusão:** `gpt-image-1 high` é o único modelo IA público com tipografia pt-BR aceitável. **Decisão:** T2 oficialmente placeholder até Pipeline Híbrido (ver [DEC-M2-004]).

### Estado final dos templates M2

| Template | Status (código) | Status (produção) |
|---|---|---|
| T1 `atual-maio26` | `'ativo'` | ✅ Em prod (commit `d25a255`) |
| T2 `atual-maio26-new` | `'em-construcao'` | ⏳ Placeholder oficial — aguarda Fase 2 (wireframes Opus) + Fase 3 (implementação Code) |
| T3 `novo-teste-1` | `'a-definir'` | ⏳ Placeholder oficial — a definir após T2 ativo |

### Custo total da sessão M2

- T1 smokes Fase 1 (validação pré-prod): ~$0.95
- Investigação T2 (3 modelos): ~$0.32
- **Total acumulado:** ~$1.27

### Bugs conhecidos / limitações aceitas

- **[BUG-M2-001]** background-check.ts não calibrado corretamente (smoke v8 saiu com fundo preto e validador aceitou). Workaround: equipe regenera manualmente quando fundo problemático aparece. Resolução estrutural prevista no T2 (Pipeline Híbrido — Sharp controla background determinístico).
- **[LIMIT-M2-001]** T1 herda limitações inerentes do gpt-image-1: variabilidade tipográfica, continuidade entre slides do carrossel, fundo ocasionalmente fora do gradient apesar do enforcement. Aceito como trade-off; resolução estrutural prevista no T2.

### Pendências (próximas sessões)

1. **Validação manual prod T1** — Rafael, amanhã (19/05/2026).
2. **Fase 2 (próxima sessão Opus):** wireframes T2 com qualidade visual real (SVG filters avançados — efeito metálico, gradient nebula, drop shadows, sparkles 3D). Não usar mockup amador.
3. **Fase 3 (sessão futura Code):** implementação T2 após aprovação dos wireframes.
4. **Fase 5:** T3 — direção a definir após T2 ativo.

### Commits da sessão M2 (cronológico)

```
9c32313 feat(m2): fase 1 fechada — T1 prompt v5 (anti-handle + bg enforcement + hierarquia strict)
62e55a7 feat(m2): smoke carrossel v1 (3 slides paralelo)
f783594 fix(m2): hotfix UX carrossel — 1 imagem + prompt por slide + slides expanded + reorder + rename
9d469a3 feat(m2): hotfix v2 — bg ref-image + safe area + UI fixes (toggle width + template 1-line + preview after gen)
136d32a docs(m2): registra hotfix v6 em DIVIDAS
fd406e9 feat(m2): hotfix v8 — revisor de fundo via retry + remove ref image (compensa lavagem do gpt-image-1)
d25a255 docs(m2): registra hotfix v8 + BUG-M2-001 (validador de fundo não calibrado)
<hash-fechamento-v1> docs(m2): fecha v1 — investigação T2 concluída (3 modelos testados, todos falham em pt-BR), T2 oficialmente placeholder até Pipeline Híbrido Fase 2/3
```

**FIM SESSÃO M2 V1.**
