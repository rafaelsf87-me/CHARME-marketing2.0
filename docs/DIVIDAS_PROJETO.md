# DIVIDAS_PROJETO.md
## Log de Dívidas Técnicas, Bugs e Melhorias Pendentes

**Como usar:** registrar aqui qualquer item que seja **identificado mas não resolvido agora**. Não usar como TODO list de tarefas planejadas — usar para itens que **emergem durante o desenvolvimento** e precisam ser registrados pra não serem esquecidos.

**Formato:** item mais recente no topo de cada categoria.

**Política:** revisar este arquivo ao final de cada sprint/marco. Resolver, descartar ou repriorizar itens.

---

## ✅ Resolvidos / Não-bugs

### [MEL-M2-012] Preservação literal de subtitle — INVESTIGADO, não é bug em prod (19/05/2026)
- **Hipótese inicial:** smoke Fase 6 v3 cenário 3 mostrou subtitle "Gordura, mau cheiro, bactérias e sujeira acumulada." quando o briefing Rafael falava em "…onde muita gente nem percebe." (sufixo de 29 chars ausente). Suspeita: LLM auto-truncando ou schema cortando.
- **Diagnóstico (caso c — input discrepancy):**
  - v2 smoke (input 80-char Apoio) → output subtitle 80 chars preservado literal. PNG renderiza em 3 linhas, completo.
  - v3 smoke cenário 3 (input 51-char Apoio) → output subtitle 51 chars preservado literal.
  - O cenário 3 do v3 foi reautorado com input ENCURTADO (perda do sufixo "onde muita gente nem percebe") ao adaptar para stress do MEL-M2-009 (cover longo). Erro de autoria do smoke, não bug de sistema.
- **Validação após fix:**
  - Smoke cenário 3 re-rodado com input correto (80-char Apoio): subtitle preservado 100% literal (parser log + PNG `smoke-cenario-3-fix-truncamento.png` confirmam).
  - Schema atual `subtitle: z.string().max(280)` cobre confortavelmente inputs realistas (3x folga).
  - Prompt LLM já tem REGRA ABSOLUTA — INVENÇÃO PROIBIDA. Funcionou em ambos os smokes.
- **Ação tomada:** corrigido input do v3 cenário 3 para usar Apoio completo (matches briefing v2). Sem mudança de código de produção.
- **Aprendizado:** smokes que mudam input para stress de OUTRO fix devem documentar a mudança no comentário. Ideal: matrix de cenários onde inputs longos/curtos viram dimensões separadas.

---

## 🐛 Bugs Conhecidos

### [BUG-M2-001] background-check.ts não detecta fundo sólido preto/branco
- **Onde:** `lib/m2/background-check.ts`
- **Descrição:** validador deveria amostrar 4 cantos 200×200 e detectar fundo sólido via HSL (saturação < 15 + brightness < 40 OU > 215). No smoke v8, output tinha fundo preto puro nos 4 cantos e validador retornou `true` (gradient OK) — retry não disparou.
- **Hipóteses:** bug na fórmula HSL, buffer Sharp retornando canais inesperados (RGBA em vez de RGB apesar do `removeAlpha()`), ou thresholds errados.
- **Severidade:** baixa — equipe regenera output quando aparece fundo problemático (workaround manual aceito).
- **Decisão:** NÃO investigar agora. Pode ser descartado se T2 (Fase 3) resolver via Sharp/Satori controle total do background.
- **Reavaliar:** antes da Fase 3 OU se equipe reportar frequência alta de fundos problemáticos em prod.
- **Identificado em:** Sessão M2 Fase 1 Hotfix v8, 18/05/2026.

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

### [LIMIT-M3-002] Flux ignora reforço de idade no prompt da atriz — DOCUMENTADA em 19/05/2026
- **Onde:** `lib/m3/atriz.ts`, `buildAtrizPrompt()`
- **Sintoma:** mesmo com "mature", "late 30s to mid 40s", "laugh lines", "Brazilian mother in her 40s — not young", Flux Pro v1.1 Ultra gera atrizes aparentando 25-32 anos. Validado em 2 smokes consecutivos (~$0.60 testando prompts).
- **Bias** do modelo pra "younger faces by default" é mais forte que prompt engineering. Limitação inerente do Flux.
- **Decisão:** aceito como está no V1. Atriz jovem-adulta funciona pro segmento. Modo Upload (UI Fase 3) permite override com foto própria.
- **Workaround futuro:** trocar pra modelo Imagen4 ou usar image-to-image com reference image. Pra V2 do M3.

### [LIMIT-M2-001] T1 Atual_Maio26 — limitações inerentes do gpt-image-1 (carrossel)
- Pipeline T1 = `fal-prompt-puro` via gpt-image-1 tier high. Desde v8: text-to-image (sem PNGs) ou edit-image (com PNGs do user).
- Limitações estruturais que reforços de prompt mitigam mas NÃO eliminam:
  - Falta de continuidade visual entre slides paralelos (sofás/produtos podem variar entre slides do mesmo carrossel)
  - Variabilidade ocasional de fundo (preto/branco sólido) — retry automático implementado mas com bug a investigar ([BUG-M2-001]). Equipe regenera quando aparece.
  - IA pode inventar handles/marcas d'água apesar de `NO BRAND ELEMENTS`
  - Hierarquia tipográfica imprecisa apesar de `TYPOGRAPHIC HIERARCHY STRICT`
  - Tipografia densa em PT-BR com diacríticos tem variabilidade
- ACEITO como trade-off do T1 ("réplica imperfeita do ChatGPT Plus"). T1 = "rascunho rápido pra brainstorm interno".
- Resolução real prevista no T2 (Atual_Maio26_New, Fase 3) via Pipeline Híbrido Sharp/Satori — controle pixel-preciso elimina TODOS esses problemas (IA fica restrita a gerar elementos isolados, layouts + tipografia + footer são 100% determinísticos).
- **Identificado em:** Sessão M2 Fase 1, 18/05/2026.

---

## 🔧 Melhorias Pendentes

### [MEL-M2-011] Cover com cena (vs produto isolado) sai com fundo residual visível
- **Onde:** `lib/m2/t2/assets/product.ts` + `lib/m2/t2/planner/parse-roteiro.ts`
- **Sintoma:** smoke Fase 6 v2 (19/05/2026) slide 1 — user pediu "Cozinha bonita com 3 áreas destacadas" como descrição da imagem. gpt-image-1 entregou cena de cozinha em fundo branco claro. rembg cortou mas deixou halos cinzas em volta dos elementos (bancada, escorredor). O sufixo `"no scene, no marble, no counter"` funcionou bem pra produto isolado (slides 2-3 saíram perfeitos) mas é violado quando o input pede cena composta.
- **Conflito de invariantes:** DEC-M2-014 + Pipeline Híbrido dizem "background é responsabilidade do compose Sharp" → IA gera só produto isolado. MAS users pedem cenas (cover tipo "olhe esses 3 problemas na cozinha"). Tensão direta.
- **Possíveis fix V2:**
  - (a) Detectar no parser quando `imagePrompt` descreve cena (múltiplos objetos + ambiente) e marcar `assetType: 'scene'` (usar `generateSceneAsset` que tem prompt diferente).
  - (b) Pipeline de 2 passos pra cover-cena: 1ª call gera cena com fundo, 2ª call usa fal-ai/evf-sam pra segmentar só os elementos destacados, descarta fundo.
  - (c) Aceitar cena com halo residual em cover (compromisso documentado) e proibir explicitamente cena em content-* (que viraram excelentes em smoke v2).
- **Bloqueia:** nada agora (cover com halo continua funcional, só esteticamente abaixo do ideal).
- **Esforço estimado:** médio-alto.
- **Identificado em:** smoke Fase 6 v2, 19/05/2026.

### [MEL-M2-010] Title overflow truncando início em cta_final com texto longo
- **Onde:** `lib/m2/t2/subtemplates/cta-final.tsx` + `lib/m2/t2/text-renderer.ts` (caso `strategy='shrink'` com `overflow=true`).
- **Sintoma:** smoke Fase 6 v2 slide 4 — title input `"3. Escorredor de louça. Ele vive molhado e pode acumular limo, resíduos e manchas sem você perceber."` (108 chars). text-renderer entregou 5-6 linhas no fontSizeMin (80px), `overflow=true`. Container Satori com `alignItems: 'center'` + `overflow: 'hidden'` cortou as linhas de cima visualmente → render começa em "LOUÇA. ELE VIVE MOLHADO..." (perdeu "3. ESCORREDOR DE").
- **Causa raiz:** `fitTextToBox` em modo 'shrink' retorna TODAS as lines quando não cabem (não trunca), confiando no overflow:hidden do container. Container centraliza verticalmente → topo cortado.
- **Fix V2 proposto:**
  - (a) text-renderer: em strategy='shrink' com overflow=true, aplicar `lines.slice(0, maxLines)` (alinhado com 'truncate-ellipsis' mas sem '…').
  - (b) cta-final.tsx: trocar `alignItems: 'center'` por `'flex-start'` no title quando overflow detectado (preserva início).
  - (c) Planner: cap explícito de 80 chars no title de cta_final (quebra o resto pro subtitle).
- **Bloqueia:** nada (slide ainda transmite mensagem via subtitle + CTA visíveis).
- **Esforço estimado:** baixo (1h).
- **Identificado em:** smoke Fase 6 v2, 19/05/2026.

### [MEL-M2-004] Consistência de FORMA/PROPORÇÃO em comparison-before-after
- **Onde:** `lib/m2/t2/assets/product.ts` + `lib/m2/t2/subtemplates/comparison-before-after.tsx`
- **Sintoma:** smoke Fase 6 (19/05/2026) mostrou que before/after da mesma "transformação" saem com FORMA FÍSICA e PROPORÇÃO diferentes — uma bucha cúbica alta vs uma achatada retangular, parecendo produtos distintos em vez do mesmo objeto em condições diferentes. Quebra a tese visual de "transformação do mesmo objeto".
- **Causa raiz:** 2 chamadas independentes ao gpt-image-1 text-to-image (uma por imagePrompt). Modelo não tem memória do primeiro output ao gerar o segundo.
- **Fix futuro proposto (V2):**
  - (a) Prompt mais agressivo: `"same product, same physical form, same proportions, same dimensions, only condition differs (used+dirty vs new+clean)"`.
  - (b) Image-to-image: gerar 1 imagem do produto novo, usar como reference pra gerar versão "envelhecida" (image edit). Fluxo: 1ª call text-to-image do "novo" → 2ª call image-edit com `image_url=novo` + prompt "make this used and dirty, keep exact shape/proportions".
  - (c) Trocar pra Flux Kontext (image edit) ou Imagen4 com reference image.
- **Bloqueia:** nada agora (slide comparison funciona, só não tem consistência visual perfeita).
- **Esforço estimado:** médio (1 dia: testar 2-3 abordagens + smoke comparativo).
- **Identificado em:** smoke Fase 3, atualizado smoke Fase 6, 19/05/2026.

### [MEL-M2-009] Validar legibilidade do cover.tsx title com imageSlot
- **Onde:** `lib/m2/t2/subtemplates/cover.tsx`
- **Descrição:** layout cover com imageSlot na Fase 6 comprime altura do title de ~420px (sem-img) → 200px (com-img). Smoke Fase 6 (19/05/2026) produziu title legível mas em fontSize médio (~96 max). Em textos mais longos pode ficar desproporcionalmente pequeno. Considerar se aparecer:
  - (i) image menor (400×400 ao invés de 600×680) liberando vertical pra title
  - (ii) image posicionada lateral em vez de abaixo
  - (iii) ajustar fontSizeMin do title pra forçar wrap em mais linhas
- **Impacto esperado:** legibilidade do hook principal do carrossel em textos extensos.
- **Esforço estimado:** baixo (smoke parametrizado com 5 títulos de tamanhos diferentes).
- **Identificado em:** 19/05/2026, pré-implementação Fase 6.

### [MEL-M2-002] Pesos tipográficos extras Montserrat
- **Onde:** `public/fonts/`, consumidores em `lib/m2/t2/subtemplates/*` (futuros) e `lib/m3/templates/*`.
- **Descrição:** se Fase 1/2 do T2 exigir Montserrat além de SemiBold (600), Bold (700) e ExtraBold (800) já presentes em `public/fonts/`, subir TTFs estáticos do JulietaUla/Montserrat (Light 300, Regular 400, Medium 500). Satori 0.11.3 não suporta variable fonts (LIMIT-M3 já documentada).
- **Impacto esperado:** mais variedade tipográfica nos subtemplates T2 sem comprometer fidelidade visual.
- **Esforço estimado:** baixo — download dos TTFs do repo open-source + registro em `next.config.mjs` (`outputFileTracingIncludes`).
- **Identificado em:** Sessão M2 T2 Fase 0, 18/05/2026 (originalmente DIV-M2-011 no patch).

### [MEL-M2-001] Criar 8 backgrounds T2 manuais — bloqueio Fase 1
- **Onde:** `public/brand/m2/backgrounds/` (dir já existe, hoje só tem `gradient-base.png` do T1 hotfix v6).
- **Descrição:** T2 Pipeline Híbrido depende de catálogo de backgrounds curados manualmente. Rafael cria 8 backgrounds usando template SVG entregue em `docs/m2-t2-background-template.svg` / `docs/m2-t2-background-template.png` (commit `8fb8972`) como guia visual.
- **Names exatos:** `gradient-roxo-01.png` / `-02.png` / `-03.png`, `gradient-cyan-01.png` / `-02.png` / `-03.png`, `solid-purple-01.png`, `solid-white-01.png`. Dimensão **1080×1350** PNG ou WEBP qualidade 90. Sem texto, sem footer, sem logo embutido.
- **Variants por family (gradient-*):** `-01` top-anchored, `-02` centered, `-03` bottom-anchored. Continuidade visual: slides do mesmo carrossel usam mesma family, variants alternam.
- **Impacto esperado:** desbloqueia Fase 1 do T2 (background catalog populated → text-renderer + cover subtemplate + compose mínimo). Sem isso, Code não pode prosseguir.
- **Esforço estimado:** médio — depende de ferramenta visual do Rafael (Figma/Canva/Photoshop). Sem código.
- **Identificado em:** Sessão M2 T2 Fase 0, 18/05/2026 (originalmente DIV-M2-010 no patch).

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

### [FEAT-M2-001] Editor visual pixel-preciso pra T2
- **Descrição:** editor visual permitindo ao user arrastar/redimensionar slots de texto e imagem dentro do canvas T2 (1080×1350), ajustar fontSize manualmente, escolher fonte por slot, alterar paleta de cores em runtime.
- **Por que faz sentido:** complementa o pipeline programático (Planner + subtemplates) com ajuste fino quando o auto-fit não converge no resultado desejado.
- **Estado V1:** **fora do escopo**. T2 V1 entrega via campos do form + comando textual "Regerar slide" ([DEC-M2-013]) com instrução em PT-BR ("trocar fundo", "diminuir fonte do título", etc).
- **Quando reavaliar:** após validação prod do T2 V1. Se equipe relatar fricção alta com auto-fit / regerar, abrir RFC de editor visual.
- **Identificado em:** Sessão M2 T2 Fase 0, 18/05/2026 (originalmente DIV-M2-009 no patch).

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

### [REF-M2-007] Migração off do fal-ai/any-llm deprecated
- **Onde:** `lib/m2/t2/planner/parse-roteiro.ts`
- **Descrição:** endpoint `fal-ai/any-llm` está marcado como deprecated por fal.ai desde 19/05/2026 (vide landing page). Continua funcional e o smoke Fase 6 passou com `anthropic/claude-haiku-4.5` via esse endpoint, mas o risco de quebrar é real. Migrar antes da quebra definitiva pra:
  1. **`openrouter/router`** (também via FAL_KEY, não-deprecated) — mais simples, zero setup novo.
  2. **`@anthropic-ai/sdk` direto** — requer `ANTHROPIC_API_KEY` em `.env.local` + Vercel. Adiciona 1 dep, custo idêntico ou levemente menor (sem markup FAL).
- **Bloqueia:** nada agora — parser tem fallback regex que garante geração mesmo se LLM cair.
- **Esforço estimado:** baixo (30 min: trocar endpoint + ajustar input/output shape se mudar).
- **Identificado em:** 19/05/2026, Fase 6.

### [REF-M2-005] Cleanup definitivo do T1 após 30 dias de estabilidade T2
- **Onde:** `lib/m2/templates/atual-maio26/`, `lib/m2/templates/atual-maio26-new/`, `lib/m2/templates/novo-teste-1/`, `lib/m2/render.ts`, `lib/m2/fal-client.ts`, `lib/m2/background-check.ts`, `lib/m2/post-process.ts`, `lib/m2/templates/atual-maio26/prompt.ts`, `app/api/imagens/m2/generate/`, `app/imagens/m2-posts/_components/form-imagem-unica.tsx`, `form-carrossel.tsx`, `modo-geracao-selector.tsx`, `slide-block.tsx`, `logo-selector.tsx`, `png-upload-list.tsx`, `tab-switcher.tsx`.
- **Descrição:** T1 (`atual-maio26`) removido do registry em 19/05/2026 (decisão executiva — T2 vira único template ativo). Código preservado **30 dias** como segurança de rollback. Após `2026-06-18` sem necessidade de voltar pro T1, remover definitivamente:
  - Pastas `lib/m2/templates/atual-maio26/`, `atual-maio26-new/`, `novo-teste-1/`
  - Pipeline puro IA do T1: `lib/m2/render.ts`, `lib/m2/fal-client.ts`, `lib/m2/background-check.ts`, `lib/m2/post-process.ts`
  - Route handler `app/api/imagens/m2/generate/route.ts` (manter a pasta `_components/` cujos arquivos não são mais alcançáveis pelo UI, ou apagar tudo junto).
  - Remover entries `'atual-maio26' | 'atual-maio26-new' | 'novo-teste-1'` de `M2_TEMPLATE_IDS` em `lib/m2/schema.ts`.
- **Bloqueia:** nada agora — código está fora do path de uso (registry só expõe T2 + placeholder "Em breve").
- **Esforço estimado:** médio (1 dia: deletar arquivos + ajustar enum + rodar typecheck/build/smoke pra garantir que nada quebrou).
- **Identificado em:** 19/05/2026, decisão executiva apagar T1.

### [REF-M2-003] Aposentar footer programático após DEC-M2-015
- **Onde:** `lib/m2/footer-gen.ts` e `lib/m2/t2/footer.ts`.
- **Descrição:** [DEC-M2-015] estabelece que footer no T2 é **embutido no background do cta-final**. O footer programático fica como fallback técnico mas não é mais o caminho de produção. Remover (ou marcar como `@deprecated`) após T2 estabilizar em prod.
- **Bloqueia:** nada agora — código permanece e não é chamado em pipeline de produção.
- **Esforço estimado:** baixo (1 arquivo `lib/m2/footer-gen.ts` removido + remover `lib/m2/t2/footer.ts` + ajustar compose.ts pra remover branch `plan.footer.enabled`).
- **Identificado em:** Sessão M2 T2 Fase 2, 19/05/2026.

### [REF-M2-002] Validar widthFactor 0.66 do text-renderer em textos extremos
- **Onde:** `lib/m2/t2/text-renderer.ts` (função `widthFactorFor`).
- **Descrição:** widthFactor conservador (ExtraBold 0.66) funcionou no smoke Fase 1 com texto "SUA BUCHA PODE ESTAR SUJANDO MAIS" (33 chars). Validar com textos extremos antes de fechar V1:
  - Textos curtos (5-15 chars) — pode estar reservando largura demais
  - Textos longos (>60 chars com palavras compostas)
  - Diacríticos densos pt-BR (ação, coração, sensação, percepção)
  - Palavras compostas/grandes (LIMPEZA, ARMARINHO)
- Se algum cenário regredir (overflow visual no Satori ou desperdício de fontSize), recalibrar factor ou substituir heurística por measureText real via Resvg/canvas.
- **Bloqueia:** nada agora.
- **Esforço estimado:** baixo (smoke parametrizado com 5-10 textos diferentes).
- **Identificado em:** Sessão M2 T2 Fase 1, 19/05/2026.

### [REF-M2-001] Limpar gradient-base.png após T2 em prod
- **Onde:** `public/brand/m2/backgrounds/gradient-base.png`
- **Descrição:** arquivo usado pelo T1 (`render.ts:78-81`, hotfix v8 retry com background-check.ts). Deve ser removido junto com a descontinuação do T1 quando T2 estabilizar em prod. T2 não usa esse asset — catálogo T2 (`lib/m2/t2/backgrounds/catalog.ts`) referencia os 10 backgrounds curados manualmente (starfield-01..08, solid-purple-01..02).
- **Bloqueia:** nada — coexistência é zero-impacto.
- **Esforço estimado:** baixo (1 arquivo removido + audit pra garantir que T1 foi descontinuado).
- **Identificado em:** Sessão M2 T2 Fase 1, 19/05/2026.

### [REF-M1-006] Auditar prompts M1 vs política de "upload é asset pronto"
- **Onde:** `lib/m1/render-pipeline-a.ts`, `lib/m1/render-pipeline-detalhe.ts`, `lib/m1/prompts.ts` (todos os builders que recebem `fotoSofa`/`fotoRolo` do user).
- **Por que refatorar:** [DEC-M2-014] estabelece pra T2 que upload do user é **asset pronto** — IA não pode copiar background/layout/tipografia/contexto da referência. Política deve valer também pro M1, que hoje passa `fotoSofa` e `fotoRolo` pro nano-banana com instruções variadas dependendo do branch (Pipeline A, Pipeline Detalhe, Capa Lisa).
- **Auditoria:** revisar cada prompt builder e identificar onde o modelo é instruído a usar a foto do user. Se algum bloco diz coisas tipo "use the reference image as full reference" ou similar (sem restrição explícita ao produto/objeto), reescrever pra:
  - "produto/objeto isolado da referência, sem copiar background, layout, tipografia, marca d'água, texto ou contexto visual ao redor"
- **Bloqueia:** nada agora — M1 funciona. Auditoria pode ser feita em paralelo a outras tarefas.
- **Esforço estimado:** baixo (auditoria + ajuste de prompts; sem mudança de pipeline ou modelo).
- **Identificado em:** Sessão M2 T2 Fase 0, 18/05/2026 (originalmente DIV-M1-001 no patch).

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

### [BUG-M2-003] Planner T2 não interpreta roteiro estruturado humano — RESOLVIDA em 19/05/2026
- **Resolução (Fase 6):** novo parser LLM em `lib/m2/t2/planner/parse-roteiro.ts` usando `anthropic/claude-haiku-4.5` via `fal-ai/any-llm`. Extrai `{title, subtitle, bullets, imagePrompt, cta}` ignorando labels meta ("Texto:", "Apoio:", "Descrição da imagem:", "CTA:"). `imagePrompt` traduzido pra inglês pelo LLM. Fallback regex sempre disponível (timeout 10s, JSON inválido, Zod fail → cai pra heurística determinística).
- **Smoke real (~$1.25, 83s):** 4 slides com input bruto colado por humano. LLM extraiu 3/3 corretamente, 0 fallbacks. Titles "3 ITENS DA COZINHA POR ATÉ R$10" / "O QUE TROCAR AGORA" / "APROVEITE A PROMOÇÃO" (não mais "TEXTO"). QC consolidado pass=true, avg score 98.75/100, 0 errors.
- **Custo prod:** ~$0.001/slide LLM (Haiku 4.5). Carrossel 8 slides = ~$0.008 — desprezível vs $2 da geração IA.
- **Risco:** endpoint deprecated (vide [REF-M2-007]). Fallback regex garante zero downtime.

### [BUG-M2-004] ImageSlots ignorados em 4/5 subtemplates — RESOLVIDA em 19/05/2026
- **Resolução (Fase 6):** novo helper `buildImageMainSlot` no Planner cria `imageSlot` com `id='image-main'` quando (a) `modoGeracao='upload'` + `imageMainUploadUrl` presente → `source='uploaded'` ou (b) `modoGeracao='ia'` + `parsed.imagePrompt` (do LLM) presente → `source='ai_generated'`. Aplicado em cover, content-3-boxes, content-6-boxes, cta-final.
- **Layouts condicionais por subtemplate:**
  - **cover:** sem-img mantém atual (title 280..700, subtitle 740..960). Com-img comprime textos no topo (title 60..260, subtitle 280..420) + hero 600×680 abaixo (240..1140).
  - **content-3-boxes:** sem-img mantém full-width. Com-img split half-half (boxes esquerda w=440, imagem direita 460×780).
  - **content-6-boxes:** sem-img mantém full-width. Com-img encolhe boxes esquerda (w=400, arrow w=50) + imagem direita 420×810.
  - **cta-final:** image-main 360×160 como badge hero topo (y=70..230), `treatment='circle'/'rounded'`. Conservador: Planner SÓ cria slot SE LLM devolver `imagePrompt` explícito (default LLM = null pra cta_final).
- **API SubtemplateModule estendida:** `resolveTextSlotDefs?(plan): TextSlotDef[]` permite ao subtemplate trocar boxes/fontSizeMax conforme estado do plan. compose.ts respeita o override.
- **Smoke real:** slide 1 (cover) com imagem 600×680 visível, slide 2 (content_6) com 6 bullets + imagem lateral (sobreposição borderline aceitável — ver [MEL-M2-009]), slide 3 (comparison) com 2 imagens IA, slide 4 (cta_final) sem image (LLM devolveu imagePrompt=null como esperado).
- **Resolve também [REF-M2-006]** que tinha sido aberta na Fase 5 com escopo idêntico.

### [BUG-M2-005] alignItems flex-end + widthFactor + overflow (latente) — RESOLVIDA em 19/05/2026
- **Resolução (Fase 6):** 3 mudanças cirúrgicas:
  - **alignItems:** trocado de `'flex-end'` pra `'center'` em todos os containers de title/subtitle/cta/box dos 4 subtemplates (cover, content-3, content-6, cta-final) + comparison (title + caption). Evita extravasamento pra cima do canvas em texto longo.
  - **widthFactor:** bumped +0.04 em `text-renderer.ts` (800→0.70, 700→0.66, 600→0.62, default→0.56). Conservador — fontSize fica ~5% menor mas wrap converge antes de gerar overflow.
  - **overflow: hidden:** adicionado em todos os containers de title/subtitle/cta/box pra impedir vazamento visual final caso o text-renderer ainda assim erre.
- **Smoke real:** títulos longos centralizados sem corte top/bottom, fontSizes razoáveis em todos os slides.

### [MEL-M2-008] Auto-extração de keyword pra UI sem campo dedicado — RESOLVIDA em 19/05/2026
- **Resolução (hotfix anterior, commit 798bea9):** campo "Palavra-chave do arquivo (opcional)" removido do UI dos 4 módulos (M1, M2 T2, M3, M4). Novo `autoExtractKeyword(opts)` em `lib/filename.ts` extrai keyword automaticamente do conteúdo do form via discriminated union por módulo. Schema das APIs segue aceitando `keyword?: string` opcional pra retro-compat. Smoke `scripts/smoke-hotfix-keyword/` 14/14 pass.

### [REF-M2-004] Retrofit padrão de nome `img-{modulo}-{slide}-{keyword}-{mes}{ano}` em M1/M2T1/M3/M4 (Fase 4.5) — RESOLVIDA em 18/05/2026
- **Escopo:** aplicar `lib/filename.ts` (criada na Fase 4) em todos os módulos pré-existentes. Tarefa mecânica e isolada por módulo — não tocar em pipeline IA, prompts ou render.
- **Mudanças por módulo:**
  - **M1:** campo `keyword` no `M1RenderSchema`; `KeywordField` no form antes do `GenerateButton`; helper `m1KeywordFallbackSource` (Lisa → `cor-{hex sem #}`; Estampada/Alto-Relevo → primeira palavra do nome do arquivo da `fotoSofa`); API `/render` e `/regerar` retornam `normalizedKeyword` + `generatedAt`; `ResultSlot.status.ready` carrega esses campos pra montar filename via `buildDownloadFilename({ kind: 'm1', tipoFoto, ... })`.
  - **M2 T1:** campo `keyword` em `imagemUnicaSchema` e `carrosselSchema`; `KeywordField` em `form-imagem-unica.tsx` e `form-carrossel.tsx` antes do botão Gerar; API `/m2/generate` retorna `normalizedKeyword` + `generatedAt` (fallback: imagem-única → `copyTexto`; carrossel → `contextoGeral || slides[0].copyTexto`); `preview-imagem-unica.tsx` e `preview-carrossel.tsx` usam `buildDownloadFilename`.
  - **M3:** campo `keyword` em `M3InputSchema`; `normalizedKeyword` em `M3OutputSchema`; `KeywordField` na page antes do botão Gerar (via `form.watch/setValue`); API `/m3/render` calcula `normalizedKeyword` (fallback `textos.nomePromocao`) e propaga junto do output; `preview-banners.tsx` troca `<a download>` direto por `DownloadButton` + `buildDownloadFilename({ kind: 'm3', formato })`.
  - **M4:** campo `keyword` em `M4RenderSchema`; `KeywordField` em `m4-form.tsx` antes do botão Gerar; API `/m4/render` retorna `normalizedKeyword` + `generatedAt` (fallback `line1`); `preview-area.tsx` usa `buildDownloadFilename({ kind: 'm4', ... })`.
- **Refatoração compartilhada:** `app/imagens/m2-posts/_components/t2-form/t2-keyword-field.tsx` movido pra `components/shared/keyword-field.tsx` (export `KeywordField`); T2 atualizado pra importar do shared sem regressão. Tooltip padronizado: `"Palavra-chave do arquivo (opcional). 1 palavra, max 20 chars. Fallback: primeira palavra do conteúdo."`.
- **Smoke programático Fase 4.5:** `scripts/smoke-fase4-5-filename/run.ts` com 8 asserts (4 por módulo: padrão correto com keyword preenchido; 4 por módulo: fallback funciona com keyword vazio). Todos passam (8/8). Sem custo IA.
- **Validação:** typecheck + lint + `next build` verdes. T2 segue usando o mesmo padrão sem regressão (mesmo `buildDownloadFilename`, mesma utility).
- **Origem:** [DEC-M2-012] (decisão original); reabriu Fase 4.5 pra cobrir M1/M2T1/M3/M4 (apenas T2 entregue na Fase 4).

### [DEC-M2-016] Exceção à regra de validação visual na Fase 4 — RESOLVIDA em 19/05/2026
- **Decisão executiva do CEO:** Fase 4 (UI + API /render + /regerar + T2Form isolado) fechada **sem validação visual end-to-end manual**. Smoke programático Fase 4 ($0 — Planner + buildDownloadFilename + slugifyKeyword + classifyAjusteIntent + applyAjusteToPlan) passou todos os asserts. Build verde (typecheck + lint + next build).
- **Risco assumido:** UI T2 ainda não foi clicada por humano em dev local — fluxos `Gerar Posts` (com Submit + 4 cards de preview), `Download` (com filename `img-m2-...`), `Regerar` (dialog + loading isolado + atualização do card único) confirmados apenas via build estático + smoke programático das partes novas.
- **Mitigação:** T2 disponível em prod com badge **"beta"** no template-selector. T1 (`atual-maio26`) permanece como ATIVO default. Equipe pode optar por não usar T2 até estabilizar.
- **Validação real consolidada na Fase 5 (smoke prod oficial):** primeiro carrossel real gerado em prod via UI servirá como gate definitivo de UX + API + regerar.
- **Razão da exceção:** smoke da Fase 3 já validou pipeline end-to-end com IA real (4 slides, 2 assets gpt-image-1 high, $0.50, all pass, score 98.8). Fase 4 adiciona apenas API surface + UI surface — mudanças cosméticas vs comportamentais. Custo de simular UI via tooling vs valor agregado não compensa.

### [DEC-M2-015] Footer apenas no cta-final, embutido no background — RESOLVIDA em 19/05/2026
- **Decisão:** footer (logo + @handle) aparece **apenas no slide de fechamento** (`subtemplateId='cta-final'`), **embutido visualmente** no PNG do background `cta-final-bg-01.png` (curadoria manual do Rafael, pixel-perfect, ~150px inferiores). Slides `cover`/`content-*`/`comparison-before-after` **NÃO carregam footer**.
- **Restrições estruturais:**
  - Carrossel com ≥2 slides obriga último slide = subtemplate `cta-final`.
  - Imagem única usa `cta-final` como subtemplate base (compartilha o background com footer embutido).
- **Implicações no QC:** check `FOOTER_MISSING` aplica **só** quando `subtemplateId === 'cta-final'`. Slides cover/content/comparison não emitem erro de footer ausente.
- **Footer programático (`lib/m2/footer-gen.ts` + `lib/m2/t2/footer.ts`)** vira fallback técnico, não usado em produção V1. Ver [REF-M2-003].
- **Asset bloqueante:** Rafael cria `public/brand/m2/backgrounds/cta-final-bg-01.png` em paralelo. Smoke Fase 2 roda 3 slides (cover + content + comparison) enquanto o asset não está disponível.
- **Implementado:** Planner Fase 2 força slide N-1 = cta-final pro carrossel; subtemplate `cta-final.tsx` posiciona texto na safe area 60..1190 (top 60..bottom 1100 deixa 250px inferiores pro footer já embutido no PNG).

### [DEC-M2-014] Upload tratado como ASSET PRONTO no T2 — RESOLVIDA em 18/05/2026
- **Decisão:** quando `imageSlot.source === 'uploaded'`, o arquivo é **asset pronto**. Compose Sharp direto sobre o background do catálogo. **NÃO enviar pro GPT Image.** Upload do user nunca define background, layout, tipografia, cores, marca d'água, texto ou contexto visual ao redor.
- **Implementação:** `compose.ts` tem branch explícito `source === 'uploaded'` → bypass `lib/m2/t2/assets/`.
- **Prompt obrigatório** se algum subtemplate futuro precisar passar upload pra IA (perspectiva/luz): `"Use the uploaded image ONLY as the exact product/object to place in the composition. Do NOT copy its background, layout, typography, colors, watermark, brand style, text, or surrounding context. The product must be isolated, no text, no UI elements, no other objects from the reference."`
- **QC novo:** `UPLOAD_LEAKED_REFERENCE` (warning) detecta vazamento via OCR no bbox do `imageSlot` quando `source === 'uploaded'` e texto longo é detectado.
- **Reforço:** mesma política deve valer para M1 — ver [REF-M1-006].
- **Implementado:** invariante I2 no `lib/m2/t2/README.md`, declarado em `lib/m2/t2/types.ts` (`ImageSlotSource`), branch `compose.ts` (stub Fase 0, ativo Fase 1). Commit `a46a309`.

### [DEC-M2-013] Regerar slide individual no T2 — RESOLVIDA em 18/05/2026
- **Decisão:** endpoint `POST /api/imagens/m2/t2/regerar` recebe `{ slideIndex, ajustePrompt, slidePlanOriginal, packAssets, contextoOriginal }` e re-roda renderM2T2 **apenas pro slideIndex**. Nunca regera carrossel inteiro.
- **Planner interpreta `ajustePrompt`** e modifica SlidePlan daquele slide:
  - "fundo"/"cor"/"claro"/"escuro" → troca `backgroundId` mantendo family
  - menção a produto/objeto/"imagem" → regenera asset (marca pack key dirty)
  - "diminuir fonte"/"encurtar"/"menos texto" → ajusta textSlots
- **CarouselAssetPack reusado** — não regenera asset principal salvo quando ajuste explicitamente pede. Loading isolado por card no UI.
- **Custo:** $0 se layout/texto/background apenas. ~$0.25 se regenera asset IA.
- **Implementado:** stubs em `lib/m2/t2/render.ts` (`renderSlideRegerar`) + `lib/m2/t2/planner.ts` (`applyAjusteToPlan`). Ativo na Fase 4. Commit `a46a309`.

### [DEC-M2-012] Padrão de nome de download `img-{modulo}-{slide}-{keyword}-{mes}{ano}` — RESOLVIDA em 18/05/2026
- **Decisão:** padronizar nome de arquivo de download retroativo em M1/M2/M3/M4 via `lib/filename.ts` (utility novo). Inclui campo opcional `keyword` no schema de cada módulo. Fallback hierárquico: primeira palavra do tema/copy/promoção slugificada → `'sem-tema'`.
- **Fragmento `slide` por módulo:** M1 (`capa`, `ambiente`, `elastico`, `detalhe`, `vestindo`), M2 (`imagem-unica`, `slide1`..`slide8`), M3 (`desktop`, `mobile`), M4 (`thumb`).
- **Encurtamentos M1:** `detalhe-tecido` → `detalhe`, `vestindo-capa` → `vestindo`.
- **Sem prefixo no M3:** só `desktop`/`mobile` (não `banner-desktop`).
- **Retrofit M3:** trocar `<a download>` direto em `preview-banners.tsx` por `DownloadButton` centralizado.
- **Exemplos:** `img-m2-slide3-bucha-mai26.png`, `img-m3-desktop-descontao-mai26.webp`, `img-m1-capa-floral-jun26.webp`.
- **Implementação:** `lib/filename.ts` (pendente). Adicionar campo `keyword` em cada form (M1/M2/M3/M4), default = primeira palavra slugificada de tema/copy/promoção/line1.

### [DEC-M2-008] QC programático com qualityScore 0-100 — RESOLVIDA em 18/05/2026
- **Decisão:** T2 introduz validador programático em `lib/m2/t2/qc.ts`. `pass = errors.length === 0`. `qualityScore` calculado: 100 base, −20 por error, −5 por warning, floor 0.
- **Política de retry:**
  - **Errors estruturais** (`CANVAS_DIM_WRONG`, `FOOTER_MISSING`, `IMAGE_SLOT_EMPTY`): falha hard sem retry — Planner/Compose erraram, retry não resolve.
  - **Errors visuais** (`TEXT_OUTSIDE_SAFE_AREA`, `BACKGROUND_LUMA_VS_TEXT`, `BLEED_CHECK_FAILED`): retry 1× só do asset/render desse slide. Se falhar de novo, entrega com warning visível.
  - **Warnings** (`TEXT_TRUNCATED`, `FOOTER_PARTIAL`, `UPLOAD_LEAKED_REFERENCE`): emitidos no payload, UI mostra badge "QC: N alertas" sobre o slide. Não bloqueia download.
- **Heurísticas:** canvas dim (1080×1350), safe areas, contraste WCAG AA (luma BG vs texto), footer present, bleed check (margens 60px/40px), upload leak (OCR no bbox de imageSlot uploaded).
- **Implementado:** types em `lib/m2/t2/types.ts` (`QCReport`, `QCIssue`, `QCErrorCode`), stub em `lib/m2/t2/qc.ts`. Ativo Fase 1 (mínimo) → Fase 2 (expansão). Commit `a46a309`.

### [DEC-M2-007] CarouselAssetPack — cache em memória por-request — RESOLVIDA em 18/05/2026
- **Decisão:** T2 introduz `CarouselAssetPack` (estrutura `Record<packKey, AssetPackEntry>`) pra reusar produto principal entre slides do mesmo carrossel.
- **Vida útil:** 1 request. Nunca persiste em disco, nunca em Vercel Blob (salvo URL da própria geração FAL). Cache é local à invocação da API route.
- **Efeito:** carrossel de N slides com 1 produto principal custa ~$0.25 (1× gpt-image-1 high) em vez de N × $0.25.
- **Continuidade visual:** resolve LIMIT-M2-001 (T1 gerava produtos visualmente diferentes entre slides). Slide 1 gera, slides 2..N referenciam via `imageSlot.source: 'reused-from-pack'`.
- **Implementado:** types em `lib/m2/t2/types.ts` (`CarouselAssetPack`, `AssetPackEntry`), stub em `lib/m2/t2/assets/cache.ts` (`newPack`, `addAsset`, `findAsset`). Ativo Fase 3. Commit `a46a309`.

### [DEC-M2-006] T2 layout-first, IA isolada — RESOLVIDA em 18/05/2026
- **Decisão:** T2 segue padrão **layout-first** (mesma direção arquitetural do M3 — ver [DEC-M3-001]). Sharp/Satori controlam **100%** do texto, fundo, footer, margens, caixas, setas, hierarquia tipográfica, posição final dos elementos e composição completa.
- **IA é restrita** a gerar elementos visuais isolados (produto, cena, ilustração), sempre como PNG sobre fundo neutro ou transparente. GPT Image **nunca** produz texto, footer, margens, caixas, setas, hierarquia, posição final, background final ou composição completa.
- **Por que:** resolve estruturalmente LIMIT-M2-001 (T1 fal-prompt-puro tem variabilidade tipográfica + ausência de footer + layout inerente ao modelo). Replica direção do M3 que já foi validada em prod.
- **Modelo IA escolhido pro asset isolado:** `gpt-image-1 high` (~$0.25/asset). Cache via [DEC-M2-007] reduz custo total por carrossel.
- **Implementado:** invariante I1 no `lib/m2/t2/README.md`. Commit `a46a309`.

### [DEC-M2-005] T2 isolado de T1 em `lib/m2/t2/` — RESOLVIDA em 18/05/2026
- **Decisão:** T2 (Pipeline Híbrido v2) é módulo isolado em `lib/m2/t2/`. T1 permanece em prod intocado em `lib/m2/` raiz + `lib/m2/templates/atual-maio26/` + `app/api/imagens/m2/generate/route.ts`.
- **Discriminação:** via `template.pipeline` (`fal-prompt-puro` para T1 | `hibrido-compositing` para T2). Tipo já presente em `lib/m2/templates/types.ts` — infraestrutura pronta.
- **Cross-imports T1→T2 ou T2→T1 proibidos** exceto:
  - T2 reusa `lib/m2/footer-gen.ts` (já preparado pra Híbrido — ver header do arquivo, [REF-M2-002])
  - T2 reusa type `M2LogoOption` de `lib/m2/schema.ts`
  - T2 lê `brandM2` de `lib/brand/m2.brand.ts`
- **Rota T2 separada:** `app/api/imagens/m2/t2/render/route.ts` (Fase 4). UI T2 isolada em `app/imagens/m2-posts/_components/t2-form/`.
- **Por que:** garante T1 em prod intocado durante todo o desenvolvimento T2; permite rollback granular; mantém pipelines comparáveis até validação.
- **Implementado:** scaffolding Fase 0 — 23 arquivos em `lib/m2/t2/` + `lib/m2/t2/README.md` com invariantes I1..I8. Commit `a46a309`.

### [DEC-M3-005] Templates M3 V1 — 1 ativo + 2 placeholders — RESOLVIDA em 19/05/2026
- **Decisão:** M3 V1 entrega apenas 1 template ativo (`atual-maio26` — "Descontão de Mãe"). Slots `novo-teste-1` e `novo-teste-2` ficam visíveis na UI como cards disabled com badges "em construção" / "a definir". Confirma pra equipe que mais templates virão sem prometer prazo.
- **Justificativa:** Lição do M2 (Fase 1 com 1 template em prod, T2/T3 incrementais). Ampla horizontal primeiro, refinamento depois.
- **Implementação:** Fase 1 M3.

### [DEC-M3-004] Decorações via Microsoft Fluent Emoji 3D + Flux fallback — RESOLVIDA em 19/05/2026
- **Decisão:** Banco curado de ~15 PNGs do Microsoft Fluent Emoji 3D (open source, Apache 2.0) em `public/brand/m3/decoracoes/`. User seleciona manualmente quais entram no banner. Modo fallback: Flux gera PNG transparente sob demanda (~$0.05/asset) quando banco não cobre.
- **Justificativa:** Banco gratuito de qualidade alta, ~3000 assets cobrindo 90% dos casos. Já validado no M4. Evita compra de pack pago (IconScout, Flaticon). Fallback IA mantém flexibilidade.
- **Curadoria inicial (Fase 2):** corações (rosa, vermelho, balão), foguete, presente, cartão, dinheiro, papai-noel, flor, estrela, confete, coroa, presente-azul.

### [DEC-M3-003] Atriz via IA (Flux Kontext text-to-image) ou Upload com rembg obrigatório — RESOLVIDA em 19/05/2026
- **Decisão:** Modo IA usa Flux Kontext text-to-image com prompt base forçando "Brazilian woman aged 35-45, friendly smile" + detalhes opcionais do user. Output passa por rembg automático (`fal-ai/imageutils/rembg`) pra gerar PNG cutout transparente. Modo Upload aceita PNG do user — se já transparente, usa direto; se não, rembg automático.
- **Custo:** ~$0.05 (IA + rembg) ou ~$0.005 (Upload se precisar rembg).
- **Justificativa:** BG do banner é sintético (Sharp/Satori), atriz precisa estar isolada pra compose. Rembg automático evita exigir do user que prepare PNG transparente. Endpoint Flux exato pra atriz será confirmado na Fase 2 (provável `fal-ai/flux-pro/v1.1` text-to-image).

### [DEC-M3-002] Título 3D balão via gpt-image-1 high com Prompt C parametrizado — RESOLVIDA em 19/05/2026
- **Decisão:** Endpoint `fal-ai/gpt-image-1/text-to-image`, quality `high`, size `1536x1024`, background `transparent`. Prompt parametrizado em `buildTituloPrompt(texto: string)` com a fórmula validada no smoke.
- **Smoke validatório:** 5 textos testados ("DESCONTÃO DE MÃE", "BOTA FORA CHARME", "SAÍDEIRA 2024" + 2 variações iniciais Prompt A/B/C). Custo total ~$1.20. Resultado: Prompt C entrega ~90-95% do efeito 3D balão original com fidelidade tipográfica PT-BR (acentos, cedilha, números) em todos os testes.
- **Custo por banner:** ~$0.20-0.25/título. Cache em memória (chave = texto normalizado) reduz custo quando banner regenerado.
- **Alternativas descartadas:** (1) Satori puro com técnica stack stroke + fill — gap >25% vs original. (3) SVG manual designer por template — não escala por promoção (texto é variável). gpt-image-1 high é único caminho com acabamento + parametrização.

### [DEC-M3-001] Pipeline arquitetural M3 — Híbrido (SVG/Satori controla 100% + IA isolada) — RESOLVIDA em 19/05/2026
- **Decisão:** M3 adota Pipeline Híbrido como padrão arquitetural: Sharp/Satori controla 100% do layout, BG, tipografia descritiva, card de condições, footer (determinístico). IA é restrita a 2 elementos isolados gerados como PNGs transparentes — título 3D (gpt-image-1) e atriz cutout (Flux + rembg). Decorações vêm de banco curado (Fluent Emoji 3D) com Flux fallback.
- **Justificativa:** Mesma direção arquitetural do M2 T2 (registrado em DEC-M2-004). Garante: (1) pixel-precisão de layout, (2) fidelidade tipográfica PT-BR no título, (3) BG sempre controlado (resolve estruturalmente os bugs LIMIT-M2-001 e BUG-M2-001), (4) custo ~97% menor que pipeline IA-only ($0.27 vs $0.20+ do M2 T1 fal-prompt-puro), (5) reuso de aprendizado entre M2 T2 e M3.
- **Implicações:** Pipeline Híbrido vira padrão arquitetural pra todo novo template envolvendo tipografia user-provided + composição rica. Substitui "compositing puro" (M4) quando há necessidade visual rica, e substitui "fal-prompt-puro" (M2 T1) quando há necessidade de fidelidade PT-BR + controle de layout.
- **Validação visual:** Wireframes desktop (1920×550) + mobile (800×600) v2 aprovados em 19/05/2026 — posicionamento, hierarquia, paleta paramétrica.

### [INV-M2-001] Investigação de modelos IA alternativos pro T2 — RESOLVIDA em 18/05/2026
- **Hipótese inicial:** trocar `gpt-image-1` por modelo "melhor em design" desbloquearia visual T2 sem mudar pipeline.
- **3 modelos testados via FAL** (script `scripts/smoke-m2-t2-comparativo.ts`, deletado no fechamento V1):
  - **Recraft V3** (`fal-ai/recraft-v3`, style `digital_illustration/2d_art_poster`, `image_size: {width:1080, height:1350}`, $0.04): brand identity ignorada (preset dominou e gerou look vintage circus marrom/bege/vermelho), texto pt-BR totalmente destruído ("Esclher", "Una", "Capa Elastica" sem acento, "SOFA" sem acento, "Mnutos", "27 Tecido" alucinatório). Hard limit de 1000 chars no prompt forçou cortes agressivos.
  - **Flux Pro 1.1 Ultra** (`fal-ai/flux-pro/v1.1-ultra`, `aspect_ratio: '3:4'` — enum não tem 4:5, $0.06 +2 retries falsos-NSFW): brand gradient cyan→roxo OK, mas texto totalmente alucinado ("BEEN NOME ANCUTURE + ELSS FREM", "BODY VICAN 508EFFF"), inventou domínio fake ("DFEARNFLOOKS.COM") apesar do bloco `NO BRAND ELEMENTS`. NSFW classifier disparou falso-positivo no copy português ("Veste o sofá... sem precisar tirar nada") — não há flag pra desligar, só `safety_tolerance:'6'` + `raw:true` + suavizar linguagem cinemática burlou.
  - **Ideogram V3 QUALITY** (`fal-ai/ideogram/v3`, `style: DESIGN`, `rendering_speed: QUALITY`, `expand_prompt: false`, $0.10): brand gradient OK, hierarquia tipográfica OK, mas modelo **leu o prompt** em vez do copy — renderizou "Home Textiles" (do "home textiles brand"), "MontSeerat Bold" (do "Montserrat Bold"), "#50FEFFD" (tentou renderizar hex codes), "Bradian" (de "Brazilian"), "Slasct CoUFFFF". Zero renderização do copy real. Falha catastrófica de leitura.
- **Custo total da investigação:** $0.32 ($0.04 Recraft + $0.18 Flux 3 chamadas com retries + $0.10 Ideogram).
- **Conclusão:** `gpt-image-1 high` é o único modelo IA público com tipografia pt-BR confiável. Os três modelos testados são state-of-the-art em design genérico mas falham em renderizar texto pt-BR fiel (acentos, sem alucinação de palavras, sem invenção de marcas).
- **Decisão estrutural:** T2 NÃO pode ser diferenciado via troca de modelo. Única solução viável = **Pipeline Híbrido** (Sharp/Satori texto + IA elementos visuais isolados). T2 fica placeholder oficial até Fase 2 (wireframes Opus) + Fase 3 (implementação Code). Ver [DEC-M2-004].
- Identificado em Sessão M2 V1 fechamento, 18/05/2026.

### [DEC-M2-004] T2 (Atual_Maio26_New) — direção confirmada como Pipeline Híbrido pós-investigação — RESOLVIDA em 18/05/2026
- **Pré-investigação (Sessão M2 Fase 1):** direção inicial era Pipeline B Híbrido Sharp/Satori + IA pontual pra PNGs cutout — assumida como uma das opções, não confirmada como única.
- **Pós-investigação ([INV-M2-001]):** confirmado que Pipeline Híbrido é a **única direção viável** porque nenhum modelo IA público (testados Recraft V3, Flux Pro 1.1 Ultra, Ideogram V3) substitui `gpt-image-1` em fidelidade de texto pt-BR. Diferenciação T2 vs T1 não pode vir de troca de modelo.
- **Arquitetura T2 fechada:**
  - **Texto:** 100% determinístico via Satori (Montserrat real, acentos pt-BR garantidos, hierarquia tipográfica pixel-perfeita).
  - **Background gradient:** Sharp sintético (sempre controlado, sem variabilidade — resolve [LIMIT-M2-001] e [BUG-M2-001] estruturalmente).
  - **Layout:** componente React fixo (continuidade automática entre slides do carrossel).
  - **Imagem hero:** user upload **obrigatório** com fundo removido via `fal-ai/imageutils/rembg` (~$0.005/img).
  - **Custo por geração:** ~$0.005 (97% mais barato que T1 $0.19).
- **Pendências de implementação:**
  - **Fase 2** (próxima sessão Opus): wireframes detalhados de T2. Não usar o mockup amador anterior — projetar com SVG filters avançados (efeito metálico no título, gradient nebula no background, drop shadows, sparkles 3D, etc.) pra entregar qualidade visual real.
  - **Fase 3** (sessão futura Code): implementação após aprovação visual prévia dos wireframes.
- Identificado em Sessão M2 Fase 1, **confirmado e atualizado** em fechamento V1, 18/05/2026.

### [FIX-M2-003] Hotfix v8 — revisor de fundo via retry automático (parcialmente funcional) — 18/05/2026
- Revertida a estratégia de reference image base (v6) — causava "lavagem" do gradient e desbotava output.
- Pipeline T1 volta a usar `text-to-image` quando user não fornece PNGs (edit-image apenas com PNGs do user).
- Adicionado `lib/m2/background-check.ts` + retry wrapper `generateWithBgCheck` (max 2 attempts).
- ⚠️ **VALIDADOR NÃO ESTÁ CALIBRADO CORRETAMENTE:** smoke v8 saiu com fundo preto sólido e o validador aceitou (retry não disparou). Bug no critério HSL ou no acesso ao buffer Sharp. Registrado em [BUG-M2-001].
- **Mudanças adicionais aplicadas no v8 (UX pendentes):**
  - J — `ctaFinal` removido como campo separado: CTA agora vai dentro do copy do último slide. Prompt T1 ganhou bloco `LAST SLIDE GUIDANCE` (genérico) que instrui IA a destacar visualmente CTA presente no copy.
  - K — Slides do carrossel collapsed por default (`useState(false)`). Badges "⚠ Copy pendente" e "⚠ Imagem obrigatória" no header dão visão geral sem expandir.
- Asset `gradient-base.png` permanece em `public/brand/m2/backgrounds/` pra T2 (Fase 3).
- **Decisão Rafael:** aceitar como limitação aceita do T1, equipe regenera quando aparece fundo problemático. T2 (Pipeline Híbrido Sharp/Satori, Fase 3) vai resolver definitivamente via controle programático do background.
- Identificado em validação manual prod 4, 18/05/2026.

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
