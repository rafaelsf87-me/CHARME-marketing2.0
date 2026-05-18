# DIVIDAS T2 Fase 0 — Entradas pra integrar manualmente em docs/DIVIDAS_PROJETO.md

> Padrão da sessão M3: Code gera patch, Rafael integra nos canônicos e apaga.
> Rafael nunca deixa Code editar arquivos de docs/.
>
> Após integrar, apagar este arquivo.

---

## Decisões — adicionar à seção `Decisões resolvidas`

### DEC-M2-005 — T2 isolado de T1

T2 é módulo isolado em `lib/m2/t2/`. T1 permanece em prod intocado em
`lib/m2/` raiz. Discriminação via `template.pipeline` (`fal-prompt-puro` |
`hibrido-compositing`). Cross-imports T1→T2 ou T2→T1 proibidos exceto
reuso de `footer-gen.ts`, types `M2LogoOption`, e config `brandM2`.

Data: 2026-05-18

### DEC-M2-006 — Layout-first, IA isolada

T2 segue layout-first. Sharp/Satori controlam 100% texto/fundo/footer/
margens/caixas/setas/hierarquia/posição final/composição. IA gera apenas
elementos visuais isolados (produto, cena, ilustração) sempre como PNG
sobre fundo neutro ou transparente.

GPT Image **nunca** produz texto, footer, margens, caixas, setas,
hierarquia tipográfica, posição final, background final, ou composição
completa.

Data: 2026-05-18

### DEC-M2-007 — CarouselAssetPack

Cache em memória por-request pra reusar produto principal entre slides do
mesmo carrossel. Resolve continuidade visual + reduz custo (1 produto IA
por carrossel em vez de N). Vida útil = duração da request. Nunca persiste
em disco ou Blob.

Data: 2026-05-18

### DEC-M2-008 — QC programático com score

T2 introduz QC programático com `qualityScore` 0-100. `errors` bloqueiam
entrega (estruturais sem retry, visuais com retry 1× só do asset).
`warnings` entregam com badge visível no UI.

Heurísticas: canvas dim, safe areas, contraste WCAG AA, footer present,
bleed check, upload leak.

Data: 2026-05-18

### DEC-M2-012 — Padrão nome de download

`img-{modulo}-{slide}-{keyword}-{mes}{ano}.{ext}` aplicado retroativamente
em M1/M2/M3/M4 via `lib/filename.ts`. Inclui novo campo opcional
`keyword` no schema de cada módulo. Fallback hierárquico: primeira palavra
do tema/copy/promoção → `'sem-tema'`.

Encurtamentos: `detalhe-tecido` → `detalhe`, `vestindo-capa` → `vestindo`.
M3 sem prefixo `banner-` (só `desktop`/`mobile`). M3 retrofit via
DownloadButton (substitui `<a download>` direto em preview-banners.tsx).

Data: 2026-05-18

### DEC-M2-013 — Regerar slide individual no T2

Endpoint `POST /api/imagens/m2/t2/regerar` recebe `{ slideIndex,
ajustePrompt, slidePlanOriginal, packAssets, contextoOriginal }` e re-roda
renderM2T2 apenas pro slideIndex.

Planner interpreta `ajustePrompt` e modifica SlidePlan daquele slide:
- "fundo"/"cor"/"claro"/"escuro" → troca backgroundId mantendo family
- menção a produto/objeto/"imagem" → regenera asset (marca pack key dirty)
- "diminuir fonte"/"encurtar"/"menos texto" → ajusta textSlots

CarouselAssetPack reusado — não regenera asset principal salvo quando
ajuste explicitamente pede. Loading isolado por card no UI.
**Nunca regera carrossel inteiro.** Sempre 1 slide.

Custo: $0 se layout/texto/background apenas. ~$0.25 se regenera asset IA.

Data: 2026-05-18

### DEC-M2-014 — Upload tratado como ASSET PRONTO no T2

Quando `imageSlot.source === 'uploaded'`, o arquivo é asset pronto. Compose
Sharp direto sobre o background do catálogo. **NÃO enviar pro GPT Image.**

A imagem do user nunca define background, layout, tipografia, cores, marca
d'água, texto, ou contexto visual ao redor.

`compose.ts` tem branch explícito `source === 'uploaded'` → bypass `assets/`.

Se algum subtemplate futuro precisar passar upload pra IA (perspectiva/luz),
prompt obrigatório:

> "Use the uploaded image ONLY as the exact product/object to place in the
> composition. Do NOT copy its background, layout, typography, colors,
> watermark, brand style, text, or surrounding context. The product must
> be isolated, no text, no UI elements, no other objects from the reference."

QC `UPLOAD_LEAKED_REFERENCE` (warning) detecta vazamento via OCR no bbox
do `imageSlot` quando `source === 'uploaded'`.

Data: 2026-05-18

---

## Dívidas — adicionar à seção `Dívidas técnicas` ou `A definir`

### DIV-M2-009 — Editor visual pixel-preciso

Fora do escopo V1 do T2. Reabordar pós-validação prod. Hoje o user só ajusta
via campos do form + regerar com prompt textual.

Data: 2026-05-18

### DIV-M2-010 — Backgrounds dependem de Rafael criar manualmente

Bloqueio crítico Fase 1. Code envia template SVG 1080×1350 com safeAreas
marcadas; Rafael cria 8 backgrounds em ferramenta visual de preferência e
sobe em `public/brand/m2/backgrounds/`.

Mínimo Fase 1+2: 8 backgrounds (3 gradient-roxo, 3 gradient-cyan, 1
solid-purple, 1 solid-white).

Data: 2026-05-18

### DIV-M2-011 — Pesos tipográficos extras

Se Fase 1/2 exigir Montserrat além de SemiBold/Bold/ExtraBold já presentes
em `public/fonts/`, subir TTFs estáticos do JulietaUla/Montserrat. Satori
0.11.3 não suporta variable fonts (LIMIT-M3 já documentada).

Data: 2026-05-18

### DIV-M1-001 — Auditar prompts M1 vs política DEC-M2-014

Reforçar política: upload do user é asset pronto, nunca define
background/layout/tipografia/contexto na M1. Auditar `lib/m1/render-*.ts`
e prompts atuais. Se algum prompt do M1 instrui o modelo a "usar imagem do
user como referência total" → reescrever pra "produto/objeto isolado, sem
copiar contexto da referência".

Data: 2026-05-18

---

## Próximos passos imediatos (após integrar este patch)

1. Apagar este arquivo `DIVIDAS_T2_FASE0_patch.md`.
2. Aguardar Code enviar template SVG de safeAreas (próxima sessão).
3. Criar os 8 backgrounds em ferramenta visual.
4. Subir em `public/brand/m2/backgrounds/`.
5. Autorizar Fase 1.
