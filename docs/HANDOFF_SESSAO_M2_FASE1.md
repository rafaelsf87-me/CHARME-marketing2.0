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
