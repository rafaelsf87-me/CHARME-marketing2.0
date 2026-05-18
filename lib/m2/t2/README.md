# M2 T2 — Pipeline Híbrido v2

Status: **Fase 0 (scaffolding apenas)**. Não funcional. Bloqueado em assets manuais antes da Fase 1.

T2 generaliza a direção arquitetural do M3 (DEC-M3-001) e adiciona Planner JSON,
catálogo de backgrounds, subtemplates por densidade, text renderer determinístico,
footer overlay programático, e QC com score.

---

## Invariantes obrigatórias

### I1. Layout-first, nunca image-first

Sharp/Satori controlam **100%** do layout: fundo, texto, footer, margens, setas,
caixas, hierarquia tipográfica, posição final dos elementos, composição completa.

GPT Image **NUNCA** é responsável por:
- texto final
- footer
- margens
- caixas / setas
- hierarquia tipográfica
- posição final
- background final
- composição completa

IA gera **APENAS** elementos visuais isolados (produto, cena, atriz, ilustração),
sempre como PNG sobre fundo neutro ou transparente, pra Sharp posicionar dentro
de `imageSlots` fixos definidos pelo subtemplate.

### I2. Política de Upload (DEC-M2-014) — CRÍTICO

Quando `imageSlot.source === 'uploaded'`, o arquivo é **ASSET PRONTO**. Compose
Sharp direto sobre o background do catálogo.

**NÃO enviar upload pro GPT Image.**

A imagem do user nunca define:
- background
- layout
- tipografia
- cores
- marca d'água
- texto
- contexto visual ao redor

Em `compose.ts`, branch explícito: `source === 'uploaded'` → bypass `assets/`.

Se algum subtemplate futuro precisar passar upload pra IA (perspectiva/luz),
prompt obrigatório:

> "Use the uploaded image ONLY as the exact product/object to place in the
> composition. Do NOT copy its background, layout, typography, colors,
> watermark, brand style, text, or surrounding context. The product must be
> isolated, no text, no UI elements, no other objects from the reference."

QC `UPLOAD_LEAKED_REFERENCE` (warning) detecta vazamento via OCR no bounding
box do `imageSlot` quando `source === 'uploaded'`. Se texto longo for detectado,
emite warning.

**Mesma política deve valer para M1** — DIV-M1-001 abre auditoria dos prompts
atuais do M1.

### I3. Isolamento de T1

T1 (`lib/m2/render.ts`, `lib/m2/templates/atual-maio26/`, route
`app/api/imagens/m2/generate/`) permanece em prod intocado.

T2 vive 100% em `lib/m2/t2/` + `app/api/imagens/m2/t2/render/` + UI isolada em
`app/imagens/m2-posts/_components/t2-form/`.

Cross-imports T1→T2 ou T2→T1 proibidos exceto:
- T2 reusa `lib/m2/footer-gen.ts` (já preparado pra Híbrido — ver header do arquivo)
- T2 reusa types `M2LogoOption` de `lib/m2/schema.ts`
- T2 lê `brandM2` de `lib/brand/m2.brand.ts`

### I4. Backgrounds são curadoria humana, não geração IA

Catálogo `lib/m2/t2/backgrounds/catalog.ts` referencia PNGs manuais em
`public/brand/m2/backgrounds/`. Rafael cria via ferramenta visual de
preferência (Figma, Photoshop, Canva). Code nunca gera via prompt.

Cada entrada do catalog tem `palette`, `safeAreas`, `contrast`, `density`
preenchidos manualmente (Rafael + Code juntos).

### I5. CarouselAssetPack vive 1 request

Cache em memória por-request. Reusa produto principal entre slides do mesmo
carrossel. **Nunca persiste entre requests, nunca em disco, nunca em
Vercel Blob salvo URL da própria geração FAL.**

Vida útil = duração da API call.

### I6. QC bloqueante vs alerta

- `errors[]`: erros estruturais (canvas dim errado, footer ausente, slot vazio).
  **Falha hard sem retry** — Planner/Compose erraram, retry não resolve.
- `errors[]` de origem visual (luma vs texto, text-outside-safe-area):
  **retry 1× só do asset/render desse slide**. Se falhar de novo, entrega
  com warning visível.
- `warnings[]`: emitidos no payload. UI mostra badge "QC: N alertas" sobre o
  slide. Não bloqueia download.

### I7. Continuidade visual obrigatória no carrossel

Todos os slides de um mesmo carrossel usam **a mesma `background.family`**.
Variants (`-01`, `-02`, `-03`) podem variar entre slides. Imagem única não
tem essa restrição.

Planner valida e força essa restrição. QC checa via `BACKGROUND_FAMILY_MISMATCH`
(futuro, fora do escopo Fase 0).

### I8. Regerar slide é granular (DEC-M2-013)

`POST /api/imagens/m2/t2/regerar` recebe `{ slideIndex, ajustePrompt,
slidePlanOriginal, packAssets }` e re-roda renderM2T2 **apenas pro
slideIndex**.

Nunca regera carrossel inteiro. Pack original é reusado salvo quando o
ajuste explicitamente pede mudança no asset principal (heurística do
Planner).

---

## Estrutura

```
lib/m2/t2/
├── types.ts                  Contratos JSON canônicos
├── schema.ts                 Zod paridade com types.ts
├── planner.ts                buildSlidePlan(input) → SlidePlan[]
├── backgrounds/
│   ├── catalog.ts            registry server-only (depende de assets em /public)
│   ├── catalog.client.ts     metadata client-safe (sem fs)
│   └── select.ts             chooseBackground com regra de family
├── subtemplates/
│   ├── types.ts              SubtemplateRenderArgs
│   ├── index.ts              registry { [id]: SubtemplateModule }
│   ├── cover.tsx
│   ├── content-3-boxes.tsx
│   ├── content-6-boxes.tsx
│   ├── comparison-before-after.tsx
│   └── cta-final.tsx
├── text-renderer.ts          fitTextToBox via binary search
├── footer.ts                 wrap fino sobre lib/m2/footer-gen.ts
├── assets/
│   ├── product.ts            gpt-image-1 high pra produto isolado
│   ├── scene.ts              cena ambiente sobre fundo neutro
│   └── cache.ts              CarouselAssetPack em memória
├── qc.ts                     validateSlide(buffer, plan) → QCReport
├── compose.ts                Sharp pipeline final
├── render.ts                 renderM2T2 orquestrador
└── README.md                 este arquivo
```

---

## Fases — ver SESSION_HANDOFF.md ou comando original do Rafael

- **Fase 0**: scaffolding (este commit). Build verde, nenhuma rota nova.
- **Fase 1**: pipeline mínimo sem IA. Bloqueado em 8 backgrounds manuais +
  template SVG de safeAreas.
- **Fase 2**: Planner + todos os 5 subtemplates.
- **Fase 3**: IA isolada + CarouselAssetPack.
- **Fase 4**: API route + UI T2 + endpoint /regerar.
- **Fase 5**: smoke prod.

---

## Subtemplates V1

1. `cover` — capa do carrossel (1 título + 1 subtítulo + image-main opcional)
2. `content-3-boxes` — 3 blocos de texto + 0..1 image
3. `content-6-boxes` — 6 blocos de texto + 0..1 image (denso)
4. `cta-final` — chamada de ação fechamento
5. `comparison-before-after` — 2 imagens lado-a-lado (acréscimo Rafael)

---

## Custos esperados

- Layout + texto + footer + compose: **$0** (puro Sharp/Satori).
- IA asset isolado: **~$0.25** por asset via gpt-image-1 high.
- CarouselAssetPack reutiliza produto principal → carrossel de 4 slides
  com 1 produto principal: **~$0.25** total (não 4 × $0.25).
- Regerar slide individual:
  - sem asset novo: **$0**
  - com asset novo: **~$0.25**

---

## Não-objetivos V1 (DIV-M2-009)

- Editor visual pra ajuste pixel-preciso. Reabordar pós-smoke prod.
- Geração de backgrounds via IA. **Curadoria manual sempre.**
- Modo Upload arbitrário em todos os imageSlots — V1 só `image-main` aceita
  upload, demais sempre IA/estático.
