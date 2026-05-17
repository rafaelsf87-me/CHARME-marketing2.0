# DIVIDAS_PROJETO.md
## Log de Dívidas Técnicas, Bugs e Melhorias Pendentes

**Como usar:** registrar aqui qualquer item que seja **identificado mas não resolvido agora**. Não usar como TODO list de tarefas planejadas — usar para itens que **emergem durante o desenvolvimento** e precisam ser registrados pra não serem esquecidos.

**Formato:** item mais recente no topo de cada categoria.

**Política:** revisar este arquivo ao final de cada sprint/marco. Resolver, descartar ou repriorizar itens.

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
