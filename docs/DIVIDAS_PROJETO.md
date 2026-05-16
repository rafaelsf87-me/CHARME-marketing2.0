# DIVIDAS_PROJETO.md
## Log de Dívidas Técnicas, Bugs e Melhorias Pendentes

**Como usar:** registrar aqui qualquer item que seja **identificado mas não resolvido agora**. Não usar como TODO list de tarefas planejadas — usar para itens que **emergem durante o desenvolvimento** e precisam ser registrados pra não serem esquecidos.

**Formato:** item mais recente no topo de cada categoria.

**Política:** revisar este arquivo ao final de cada sprint/marco. Resolver, descartar ou repriorizar itens.

---

## 🐛 Bugs Conhecidos

*(nenhum até o momento)*

### Template para entrada
```
### [BUG-001] Título curto
- **Onde:** caminho/arquivo, módulo
- **Descrição:** o que acontece, o que deveria acontecer
- **Severidade:** baixa / média / alta / crítica
- **Workaround:** se houver
- **Identificado em:** sessão N, DD/MM/AAAA
```

---

## ⚠️ Limitações Aceitas

### [LIMIT-M2-001] T1 Atual_Maio26 — limitações inerentes do gpt-image-1 (carrossel)
- Pipeline T1 = `fal-prompt-puro` via gpt-image-1 tier high (desde v6: sempre `edit-image` com gradient base como ref[0]).
- Limitações estruturais que reforços de prompt + reference image mitigam mas NÃO eliminam:
  - Falta de continuidade visual entre slides paralelos (sofás/produtos podem variar entre slides do mesmo carrossel)
  - IA pode inventar handles/marcas d'água apesar de `NO BRAND ELEMENTS`
  - Hierarquia tipográfica imprecisa apesar de `TYPOGRAPHIC HIERARCHY STRICT`
  - Tipografia densa em PT-BR com diacríticos tem variabilidade
- **Removido em v6 (18/05/2026):** "variabilidade ocasional de fundo" — agora travado via reference image (ver [FIX-M2-002]).
- ACEITO como trade-off do T1 ("réplica imperfeita do ChatGPT Plus"). T1 = "rascunho rápido pra brainstorm interno".
- Resolução real prevista no T2 (Atual_Maio26_New, Fase 3) via Pipeline Híbrido Sharp/Satori — controle pixel-preciso elimina TODOS esses problemas (IA fica restrita a gerar elementos isolados, layouts + tipografia + footer são 100% determinísticos).
- **Identificado em:** Sessão M2 Fase 1, 18/05/2026.

---

## 🔧 Melhorias Pendentes

*(nenhuma até o momento)*

### Template para entrada
```
### [MEL-001] Título curto
- **Onde:** caminho/arquivo, módulo
- **Descrição:** o que melhorar e por quê
- **Impacto esperado:** performance / UX / manutenção / segurança
- **Esforço estimado:** baixo / médio / alto
- **Identificado em:** sessão N, DD/MM/AAAA
```

---

## ✨ Features Futuras

Ideias que surgiram mas estão **fora do escopo atual**. Não implementar agora.

*(nenhuma até o momento)*

### Template para entrada
```
### [FEAT-001] Título curto
- **Descrição:** o que seria a feature
- **Por que faz sentido:** problema que resolve
- **Quando reavaliar:** após X, após pedido de Y, etc.
- **Identificado em:** sessão N, DD/MM/AAAA
```

---

## 🏗️ Refatoração Necessária

Código que funciona mas precisa ser melhorado antes da próxima feature relacionada.

### [REF-M2-002] Footer overlay programático implementado mas desativado no T1
- **Onde:** `lib/m2/footer-gen.ts` (função `generateFooterOverlay`), `app/imagens/m2-posts/_components/logo-selector.tsx` (escondido quando `templateId === 'atual-maio26'` nos forms).
- **Descrição:** footer-overlay programático (4 logos + handle via Sharp + SVG inline) foi implementado no Adendo §7 e validado em smoke 1. No smoke 2, ficou claro que gpt-image-1 não respeita pixel-precisamente a reserva de 100/180px no bottom — texto invadia a zona de footer. Decisão Rafael pós-smoke 2: remover footer do T1. T1 vira réplica fiel do ChatGPT Plus (que também não tem footer programático).
- **Estado atual:** código mantido em `lib/m2/footer-gen.ts` com comentário "Used by Pipeline Híbrido (T2/T3). Not active in T1.". `LogoSelector` renderizado condicionalmente em ambos os forms (`{templateId !== 'atual-maio26' && <LogoSelector ... />}`).
- **Ativação prevista:** T2 (Atual_Maio26_New, Fase 3) com Pipeline Híbrido Sharp/Satori — controle pixel-preciso elimina o problema. `logo` continua no schema M2 (sempre default `casinha`) pra evitar break.
- **Identificado em:** Sessão M2 Fase 1, 18/05/2026.

### [REF-M2-001] Vercel Blob store privado legado
- **Onde:** conta Vercel, store antigo não-deletável.
- **Descrição:** projeto tem 2 blob stores. Store público (criado depois pro M1) em uso por prod (a0360ba M1, 9c32313 M2). Store privado legado permanece sem uso — `vercel env pull` sem flag não retorna o token público (pull traz vazios pra secrets em production). Smokes locais do M2 falham no `put` por usar o token errado (não-bloqueante, fluxo prod usa env do Vercel diretamente).
- **Bloqueia:** nada (smokes locais conseguem baixar a imagem direto do FAL e rodar post-process).
- **Workaround pra smoke local:** rodar imagem manualmente via FAL URL (URL pública do CDN do fal.ai válida por horas).
- **Identificado em:** Sessão M2 Fase 1, 18/05/2026.

### [REF-005] Vestindo a Capa não converge — modo "em construção" no backend, oculto na UI
- **Onde:** `lib/m1/prompts.ts` (branch `vestindo-capa` em `buildScenarioBlock`), `lib/m1/templates.ts` (`sofaVestindoCapa1`), `lib/m1/schema.ts` (`M1_TIPOS_FOTO`).
- **Descrição:** tipoFoto `vestindo-capa` implementado com template-base reusando `sofa-detalhe-1/image-close.png` + prompt com `DRESSING ACTION` + `COVERAGE STATE` (60-70% coverage com seção bare visível) + `SINGLE FURNITURE ONLY`. Múltiplos smokes da mesma config produziram outputs muito diferentes: uma run mostrou contraste covered/uncovered + mão puxando (aceitável), outra degenerou pra sofá 100% coberto sem mão (estilo catalog). Modelo nano-banana é não-determinístico nesse caso de template macro extrapolando 3-lug. Critérios "saco retangular descendo top-down + assento exposto cinza + mão puxando borda da frente" não foram codificados — bloco atual só direciona "right armrest or one cushion area".
- **Estado:** backend (schema + templates + prompts) committado e funcional via API/scripts. UI (`app/imagens/m1-vitrine/_components/step-tipo-foto.tsx`) NÃO expõe checkbox — feature invisível pro usuário final.
- **Bloqueia:** nada agora. Outros 4 tipos de foto seguem em prod.
- **Próximo nível:** (a) reescrever bloco como `COVERAGE MECHANICS` real ("rectangular bag-like cover descending top-down, NOT yet tucked, back/seat fully exposed gray, hand pulling front edge downward"); (b) template-base dedicado fotografado com pose top-down; (c) pipeline alternativo (composite manual via Sharp com mask gradient).
- **Esforço estimado:** alto (foto novo template OU pipeline composite); médio (só iterar prompt).
- **Identificado em:** Sessão M1 V1, 17/05/2026

### [REF-004] Refinamento de fabric realism (tecido aveludado vs poliéster-elastano)
- **Onde:** `lib/m1/prompts.ts` (bloco FABRIC CHARACTERISTICS)
- **Descrição:** outputs IA em close-up renderizam tecido com aparência de "algodão premium aveludado", quando o produto real é poliéster-elastano stretch jersey (sutil brilho satinado, fino, leve). Tentativa de adicionar bloco FABRIC CHARACTERISTICS (sessão 17/05/2026) causou 3 regressões: framing wide no Detalhe Tecido close+zoom (mostrou sofá inteiro em vez de macro), encolhimento do padrão no Elástico (estampa shrinked ~50%). Bloco revertido. Próxima tentativa requer abordagem diferente — provavelmente prompt cirúrgico com safety guard explícito ou pós-processamento de imagem.
- **Bloqueia:** nada agora. Qualidade visual atual é aceitável.
- **Esforço estimado:** médio
- **Identificado em:** Sessão M1 V1, 17/05/2026

### [REF-003] Estampa renderizada ~15–25% maior que ideal — platô de prompt-engineering atingido (M1 Pipeline A2)
- **Onde:** `lib/m1/prompts.ts` (`buildStep2PromptPattern` + `buildDimensionsBlock`).
- **Por que refatorar:** após 5 iterações (PHYSICAL SCALE LAW → PATTERN COUNT → PHYSICAL DIMENSIONS + targetTileCount → HORIZONTAL PATTERN COLUMNS clamp [6,7] + `thinking_level: 'high'`), o nano-banana converge consistentemente em ~5 colunas quando o alvo dimensional é 7. Pressão maior no prompt se mostrou contraprodutiva (modelo comprime/fragmenta o padrão ou sobre-corrige adicionando almofadas decorativas).
- **Bloqueia:** nada agora — qualidade aceitável pra equipe interna na maioria dos casos.
- **Próximo nível depende de:** (a) foto-rolo REAL (foto plana do tecido em fundo neutro) substituindo o tileable sintético — Rafael planeja anexar quando disponível; OU (b) pipeline mais radical (tile-and-composite via Sharp baseado em mask, sem depender do modelo pra contar repetições).
- **Esforço estimado:** baixo (manter como está + aceitar trade-off); alto (pipeline tile-composite).
- **Identificado em:** Sessão 9, 17/05/2026

### [REF-002] Troca Grounded-SAM 2 → EVF-SAM no script `m1:generate-masks`
- **Onde:** `lib/brand/m1.brand.ts` (`falModels.groundedSam`) e `lib/m1/fal-client.ts` (`callGroundedSam` — input field renomeado `text_prompt` → `prompt`)
- **Por que refatorar:** endpoint original `fal-ai/grounded-sam-2` documentado no plano arquitetural não existe no catálogo da fal.ai (retorna 404 em 16/16 chamadas). Substituído por `fal-ai/evf-sam` (SAM com text-prompt, `prompt: "sofa" | "dining chair"`, output `data.image.url` = mask PNG binária, custo $0.005/req). Decisão tomada **sem consulta prévia** ao Rafael por ser único caminho para destravar Etapa 4 — aceita retroativamente.
- **Bloqueia:** nada agora. Masks geradas (16/16) e committadas em `3f6fa3f`. Stats binárias OK (min 0 / max 255, means 25–254 por template).
- **Validar:** na fase de treinamento de prompts, conferir visualmente se cada mask cobre exatamente a região do móvel/capa. Se alguma estiver ruim, alternativas: (a) `fal-ai/sam2/auto-segment` (sem text-prompt, retorna múltiplas masks para escolha manual); (b) redesenhar mask à mão (Figma/Photoshop). Templates de risco maior (área pequena ou ambígua): `cadeira-ambiente-1` (mean 25.4, cadeira pequena no frame), `sofa-detalhe-1` close/zoom (mean ~250, quase tudo branco — esperado em close-ups, mas confirmar).
- **Esforço estimado:** baixo se EVF-SAM passar no smoke test; médio se precisar regenerar templates específicos.
- **Identificado em:** Sessão 5 (Etapa 4 M1), 14/05/2026 — commit `3f6fa3f`

### [REF-001] `trustHost: true` em `lib/auth/config.ts` é no-op em NextAuth v4
- **Onde:** `lib/auth/config.ts`
- **Por que refatorar:** a flag `trustHost` é prop oficial só do NextAuth v5 (Auth.js). Em v4 (4.24.10), foi mantida via type extension `NextAuthOptionsV5` como prep — em runtime é ignorada. O que de fato resolve previews na v4 é o `resolveAuthUrl()` sobrescrevendo `process.env.NEXTAUTH_URL`.
- **Bloqueia:** nada agora. Validar ativação real quando subir pra NextAuth v5.
- **Esforço estimado:** baixo (remover o type extension assim que upgrade for feito).
- **Identificado em:** Sessão 1 de Infra, 14/05/2026

### Template para entrada
```
### [REF-001] Título curto
- **Onde:** caminho/arquivo
- **Por que refatorar:** problema atual (acoplamento, duplicação, complexidade)
- **Bloqueia:** o que não pode ser feito antes da refatoração
- **Identificado em:** sessão N, DD/MM/AAAA
```

---

## 📚 Dúvidas e Decisões Pendentes

Pontos onde uma decisão de produto é necessária antes de avançar.

### [DEC-007] Validação de generalização do Pipeline A2 em prod
- **Bloqueia:** nada agora — pipeline já em uso em prod.
- **Contexto:** Pipeline A2 entregue na Sessão 9 (17/05/2026): foto-sofá obrigatória + foto-rolo opcional, tileable sintético v4 (1 crop retangular do assento, sem replicação) como fallback de REF-3, `PHYSICAL DIMENSIONS` (ratio largura template/REF-2), `HORIZONTAL PATTERN COLUMNS` (só em Foto Capa, clamp [6,7]), `ZERO DECORATIVE PILLOWS`, `thinking_level: 'high'` no nano-banana. Modal de aviso quando usuário gera sem foto-rolo.
- **Status:** smokes locais consistentes em Foto Capa (sofá Set 1, estampa geométrica). Outros 3 tipos de foto (ambiente, elástico, detalhe-tecido) só validados em typecheck/lint/build — **sem render real**.
- **Aguardando:** Rafael rodar 5–10 outputs reais em prod cobrindo:
  - Foto Ambiente (multi-móvel, mesma coleção)
  - Foto Elástico (close de mão esticando capa)
  - Foto Detalhe Tecido sofá (split close+zoom) e cadeira (variant=simple)
  - 2–3 estampas distintas (boho, geométrica, alto-relevo)
- **Decisão final pendente:** aceitar Pipeline A2 como padrão definitivo OU iterar (ver [REF-003]).
- **Identificado em:** Sessão 9, 17/05/2026

### [DEC-002] Especificação completa do M5 (Banners Email)
- **Bloqueia:** implementação do M5
- **Contexto registrado:** ferramenta de email = Edrone; resto 100% TBD
- **Aguardando:** sessão de planejamento dedicada ao M5
- **Identificado em:** sessão 0, 13/05/2026

### [DEC-004] Coerência de estampa em múltiplos móveis (Foto Ambiente do M1)
- **Onde:** `lib/m1/prompts.ts` — bloco `MULTI-FURNITURE COHERENCE` dentro de `buildStep2Prompt` quando `tipoFoto === 'ambiente'`
- **Descrição:** Foto Ambiente aplica a mesma estampa em 2 sofás (2+3 lugares) ou 6 cadeiras em ângulos diferentes. Risco de inconsistência de escala/cor entre as peças.
- **Status:** A TESTAR (fase de treinamento manual após implementação)
- **Quando validar:** após Rafael testar 5–10 outputs reais cobrindo estampas simples e complexas (Boho, mandalas, padrões densos)
- **Decisão final pendente:** aceitar pipeline atual ou criar tratamento extra (ex: passar swatch + hint de escala explicitamente; rodar Step 2 com referência maior)
- **Identificado em:** Implementação M1, 14/05/2026

### [DEC-005] Pipeline 2-step + cache para todo M1 (Pipeline A)
- **Onde:** `lib/m1/render-pipeline-a.ts` + `lib/m1/cache.ts`
- **Descrição:** Step 1 gera capa neutra (swatch) com Flux Kontext a partir da foto-referência; Step 2 aplica esse swatch no template via inpainting (mask Grounded-SAM pré-gerada). Cache LRU 30min/50 entradas reutiliza Step 1 entre cenários (mesma capa, vários ambientes).
- **Status:** APROVADO em planejamento. Será marcada **RESOLVIDA** quando implementação for testada com render real (depende de FAL_KEY + Vercel Pro + PNGs dos templates).
- **Escopo ampliado (15/05/2026, v1.2):** Pipeline A agora cobre os 4 tipos de foto (capa, ambiente, elástico, detalhe-tecido) — Pipeline B eliminado. Detalhe Tecido orquestra 2× Pipeline A (close+zoom) + compositing Sharp side-by-side. Capa Lisa pula Step 1 (Step 2 só com prompt de cor HEX, sem reference_image_url).
- **Ajuste v1.2.1 (15/05/2026):** split-screen só em Sofá Detalhe Tecido. Cadeira Detalhe Tecido vira foto única (variant=simple) com 2 cenários (`cadeira-detalhe-1`, `cadeira-detalhe-2`). Roteamento agora considera `template.variant`. Total: 15 templates lógicos, 16 imagens físicas.
- **Ajuste v1.3 (15/05/2026):** lógica de Sets. Usuário escolhe Set 1 ou 2 uma vez (cards com preview da capa do Set); sistema resolve template via `getTemplate(movel, tipoFoto, set)`. Schema migrado de `cenarioId` para `set`. Fallback aceito como decisão (não dívida): Sofá Detalhe Tecido Set 2 retorna silenciosamente `sofa-detalhe-1` (split). Não há ROI em fotografar segunda variação de split.
- **Custo extra:** ~$1–2/mês (desprezível no volume da equipe de 4)
- **Justificativa:** evita retrabalho, garante qualidade em estampas complexas (Boho, alto-relevo), permite reutilizar Step 1 entre cenários e mantém prompts independentes.
- **Identificado em:** Implementação M1, 14/05/2026 — ampliado em 15/05/2026 (v1.2)


### Template para entrada
```
### [DEC-NNN] Título curto
- **Bloqueia:** o que está parado
- **Contexto:** o que já foi discutido / decidido parcialmente
- **Aguardando:** quem ou qual evento destrava
- **Identificado em:** sessão N, DD/MM/AAAA
```

---

## 🗑️ Resolvidas / Descartadas

Quando uma dívida é resolvida ou descartada, mover para cá com nota curta. Manter os últimos 20 itens, depois limpar.

### [FIX-M2-002] Hotfix v6 — reference image gradient base + safe area + UI fixes — RESOLVIDA em 18/05/2026
- Background gradient travado via reference image (resolve fundo preto/branco aleatório do gpt-image-1)
- Safe area 60px nas 4 bordas (resolve título cortado)
- Modo geração com largura natural (não full-width) — wrapper `w-fit`
- Template descrição truncada em 1 linha (`line-clamp-1` + `truncate` + `title` attribute pra hover)
- Preview só aparece após gerar (não mais placeholder pré-geração) — carrossel e imagem única
- Pipeline T1 migrou de text-to-image → edit-image sempre (mesmo custo, com `input_fidelity: high` já default)
- Asset versionado no repo: `public/brand/m2/backgrounds/gradient-base.png` (1024×1536, 53.5KB) gerado por `scripts/generate-gradient-base.ts`
- URL pública servida pelo Vercel: `https://charme-marketing2-0.vercel.app/brand/m2/backgrounds/gradient-base.png` (override por `NEXT_PUBLIC_GRADIENT_BASE_URL`)
- Identificado em validação manual prod 2, 18/05/2026. Smoke 1 imagem-única validado — todos os 6 critérios atendidos.

### [FIX-M2-001] Hotfix UX carrossel pós-validação prod — RESOLVIDA em 18/05/2026
- Slides expanded por default + badge de copy pendente / imagem obrigatória
- 1 imagem por slide (era até 8) + textarea `promptImagem` por slide opcional (substitui `instrucoesUsoImagens` global do carrossel)
- Reorder de campos do form (Contexto → Qtd+CTA → Modo+Logo → Slides → Gerar)
- Layout 2 colunas (Modo+Logo) colapsa pra 1 quando `LogoSelector` escondido (T1)
- Rename "PNGs de referência" / "ref(s)" → "Imagem do Slide" / "caracteres"
- Tooltip de pendências no botão Gerar quando disabled (lista slides com copy/imagem faltando)
- Identificado em validação manual prod, 18/05/2026. Sem novo smoke — mudança incremental de UX, não toca pipeline.

### [DEC-M2-003] T1 sem footer programático (réplica fiel do ChatGPT Plus) — RESOLVIDA em Sessão M2 Fase 1, 18/05/2026
- **Decisão:** após smokes 1 e 2, gpt-image-1 mostrou-se incapaz de respeitar pixel-precisamente reserva de 100/180px no bottom mesmo com bloco `FOOTER RESERVATION (STRICT)` no prompt. Body text continuou invadindo a zona de footer overlay. Composite Sharp resultava em texto da IA sob o footer programático.
- **Solução:** remover footer overlay do T1. Composição inteira fica por conta do gpt-image-1 (incluindo a convenção do modelo de adicionar handle/brand text, que é variabilidade aceita).
- **Mudanças:** `prompt.ts` v4→v5 sem bloco FOOTER, `post-process.ts` simplificado pra `resizeTo1080x1350` puro, `render.ts` sem `logoOption` propagado, `LogoSelector` escondido em T1 nos forms.
- **Footer programático:** mantido em `lib/m2/footer-gen.ts` pra uso pelo T2 (Fase 3, Pipeline Híbrido). Ver [REF-M2-002].
- **Implementado:** commit `9c32313`.

### [DEC-M2-002] Modo Upload pra resolver erros físicos de geração IA — RESOLVIDA em Sessão M2 Fase 1, 18/05/2026
- **Decisão:** novo radio "Modo de geração" (IA vs Upload). Modo Upload aceita 1-8 PNGs + textarea de instruções de uso por nome de arquivo/slide. Resolve erros físicos (anatomia, perspectiva impossível) ao forçar elementos visuais via reference image em vez de geração pura.
- **Schema:** `M2_MODO_GERACAO = ['ia', 'upload']` + `superRefine` validando ≥1 PNG por slide no modo upload.
- **UI:** `<modo-geracao-selector>` + blocos condicionais nos forms.
- **Implementado:** commit `9c32313`.

### [DEC-M2-001] Tier T1 definido como `high` — RESOLVIDA em Sessão M2 Fase 1, 18/05/2026
- **Decisão:** após smoke inicial em `medium` ($0.063) gerar output com erros sistemáticos de português ("Veste 9 sofá", "rapido" sem acento, "ELĂSTICA") e hierarquia tipográfica quebrada, decisão foi migrar pra tier `high` ($0.16-0.19/img). Smoke 2 e smoke carrossel confirmaram qualidade aceitável em high.
- **Custo mensal revisado:** $4.80–$22.80/mês (30-120 posts × ~$0.19). Aceito por Rafael.
- **Implementado:** `lib/m2/templates/atual-maio26/config.ts` com `quality: 'high'`, commit `9c32313`.

### [DEC-001] Dimensões exatas M3 (desktop e mobile) — RESOLVIDA em sessão 4 (15/05/2026)
- **Decisão:** Desktop 1920×550 WEBP, Mobile 800×600 WEBP
- **Implementação:** `lib/brand/m3.brand.ts`
- **Validado:** time/design do Rafael confirmou as duas proporções

### [MEL-001] Limpeza periódica do Vercel Blob — RESOLVIDA em Sessão 1 de Infra (14/05/2026)
- **Solução:** cron implementado em `app/api/cron/cleanup-blob/route.ts` com schedule diário `0 3 * * *` (03h UTC) declarado em `vercel.json`.
- **Política:** deleta blobs com mais de 7 dias; preserva tudo que começa com prefixo `templates/`. Autenticado via header `Authorization: Bearer ${CRON_SECRET}`.
- **Commit:** `83d7b6f`.

### [DEC-003] Licença Times New Roman MT — RESOLVIDA em sessão 2 (13/05/2026)
- **Decisão:** substituída por **Tinos** (Google Fonts, Apache License 2.0 — clone métrico open-source do Times, uso comercial livre).
- **Implementação:** TTFs Regular e Bold self-hosted em `public/fonts/Tinos-{Regular,Bold}.ttf`, declaração `@font-face` em `app/globals.css` com fallback Google Fonts CDN, `brandM4.fonts.text = 'Tinos, "Times New Roman", serif'`.

### [DEC-006] Endpoint `fal-ai/flux-pro/kontext` não aceita `mask_url` / `reference_image_url` — RESOLVIDA em sessão 3 (14/05/2026)
- **Solução:** Step 2 do Pipeline A migrado de `fal-ai/flux-pro/kontext` (não suporta mask+reference) para `fal-ai/flux-kontext-lora/inpaint` (suporta image+mask+reference+prompt). Custo total Pipeline A: ~$0.10/img. Arquitetura 2-step + cache preservada. Endpoint usado é `dev`+LoRA — validar qualidade na fase de treinamento; se insuficiente, migrar pra Opção B (fluxo descrito na DEC-006).
- **Implementação:**
  - `lib/brand/m1.brand.ts` — `pipeline.falModels.fluxKontextInpaint = 'fal-ai/flux-kontext-lora/inpaint'`
  - `lib/m1/fal-client.ts` — nova função `callFluxKontextInpaint()` com tipo local `FluxKontextInpaintInput` (mirror de `BaseKontextInpaintInput` do SDK)
  - `lib/m1/render-pipeline-a.ts` — Step 2 chama `callFluxKontextInpaint`; Step 1 continua em `callFluxKontext` (`flux-pro/kontext`)
  - `docs/IMPL_M1.md` bump pra v1.1
- **Validações:** typecheck/lint/build limpos.
