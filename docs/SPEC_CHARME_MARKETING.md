# SPEC.md
## Marketing IA Charme 2.0 — Especificação Funcional
### Módulo: Criação de Imagens (6 Submódulos + Template Creator)
**Versão:** 1.8 (M3 V1 detalhado · Pipeline Híbrido fechado · Template 1 Atual_Maio26 pronto pra implementação)
**Data:** 18/05/2026
**Status:** M1 V1 em prod (a0360ba) · M2 T1 em prod (d25a255) · M3/M4/M5/M6/Template Creator pendentes

---

## Visão Geral do Módulo

Sistema web (Next.js + Vercel) para geração e tratamento padronizado de imagens do e-commerce Charme do Detalhe. Operado por 2–4 pessoas da equipe de marketing, sem necessidade de conhecimento técnico.

**Princípio central:** O sistema não cria conteúdo do zero. Ele compõe, padroniza e aplica estilo em imagens e textos fornecidos pela equipe. A IA só é usada onde compositing puro não resolve.

**O sistema NÃO faz:**
- Criar textos (equipe entrega copy pronto)
- Inventar produtos ou ambientes não fornecidos
- Alterar textos "a risca" fornecidos pelo usuário
- Gerar conteúdo editorial ou criativo autônomo

**Submódulos:**
1. M1 — Foto Produto Vitrine
2. M2 — Posts Instagram
3. M3 — Banners Website
4. M4 — Thumbnails Feed Instagram
5. M5 — Banners Emails *(placeholder — penúltimo módulo a definir)*
6. M6 — Imagens Ads *(placeholder — 100% a definir)*
+ Template Creator (painel de criação de templates customizados)

---

## Autenticação

- Sistema multi-user com **login + senha por usuário**
- Não é acesso aberto via URL pública
- Detalhes técnicos: ver ARCHITECTURE.md, seção Auth

---

## Histórico e Persistência

- **Sem histórico** de imagens geradas
- Cada geração tem botão **"Fazer Download"** para o usuário salvar localmente
- Após o download, a imagem é descartada do sistema
- Cada sessão é independente

---

## Módulo 1 — Foto Produto Vitrine (`/m1-produto-vitrine`)

### Objetivo
Gerar fotos profissionais de produto (sofá/cadeira com capa) substituindo apenas a estampa/cor da capa em fotos-template pré-aprovadas. Substitui fotografia de agência para a maioria dos casos.

### Princípio técnico — IMPORTANTE
A foto-template **já contém o móvel com capa atual**, com pose, ângulo, iluminação e ambiente definidos. A IA **mantém** cenário + móvel + pose e **substitui apenas a estampa/cor** da capa pela nova referência fornecida pelo usuário.

Não é geração de cena nova. É substituição de padrão têxtil sobre superfície já posicionada.

### Tipos de foto geradas (selecionar 1 a 4 — gera em paralelo)

| Tipo | Status | Descrição |
|---|---|---|
| **Foto Capa** | ✅ Ativo | Foto principal do produto — móvel com capa aplicada, fundo/ambiente da foto-template selecionada |
| **Foto Ambiente** | ✅ Ativo | Foto ampla do ambiente com 2 sofás (2+3 lugares) ou mesa com 6 cadeiras, todos com a capa |
| **Foto Elástico** | ✅ Ativo | Close da mão esticando a capa no móvel, demonstrando elasticidade — cenário pré-aprovado |
| **Detalhe do Tecido** | ✅ Ativo | Sofá: split-screen (mão puxando + macro da costura). Cadeira: foto única (2 variações de ângulo) |
| **Vestindo a Capa** | 🚧 Em construção | Sofá com capa parcialmente aplicada + mão estendendo. Backend implementado (schema, templates, prompts) mas UI oculta — modelo não converge consistentemente nesta versão (ver REF-005). Apenas para sofá. |

### Tipos de capa

| Capa | Input do usuário |
|---|---|
| **Estampada** | Foto-referência da estampa |
| **Lisa** | Cor HEX (sem foto) — subfluxo pula Step 1 |
| **Alto Relevo** | Foto-referência da estampa quiltada |

### Fluxo de uso — passo a passo (v1.5)

```
PASSO 1: Selecionar tipo de móvel
  [Sofá]  /  [Cadeira]

PASSO 2: Selecionar Set
  [Set 1]  /  [Set 2]   ← uma escolha vale para todos os tipos de foto

PASSO 3: Selecionar tipo de capa
  [Estampada]  /  [Lisa]  /  [Alto Relevo]

PASSO 4: Selecionar tipo(s) de foto a gerar (1 a 4)
  [Foto Capa]  [Foto Ambiente]  [Foto Elástico]  [Detalhe do Tecido]
  (Vestindo a Capa oculto nesta versão — ver REF-005)

PASSO 5: Inputs da capa
  - Estampada / Alto Relevo:
      (a) Foto do sofá-padrão com a estampa aplicada — OBRIGATÓRIA
          (define escala física do padrão)
      (b) Foto plana do rolo de tecido — OPCIONAL/RECOMENDADA
          (clean source de cores e textura)
  - Lisa: seletor de cor + campo hex (sem fotos)

PASSO 6: [Gerar]
```

**Lógica de Sets:** cada móvel tem 2 Sets (estéticas/cenários distintos). O sistema resolve o template real via `(movel, tipoFoto, set)`. **Fallback documentado:** Sofá Detalhe Tecido só existe no Set 1 — pedir Sofá+Detalhe em Set 2 retorna silenciosamente o template do Set 1.

**Pipeline A2 (v1.4):** Estampada/Alto Relevo usam 2 inputs do usuário:
- **Foto-sofá** (obrigatória) = REF-2 do prompt; define a escala física real do padrão (tile size em cm).
- **Foto-rolo** (opcional) = REF-3 do prompt; clean source de cores/textura. Quando ausente, o sistema avisa o usuário via modal e roda só com REF-2.

### Inputs por combinação (v1.5)

#### → Capa Estampada ou Alto Relevo (qualquer tipo de foto)
| Campo | Obrigatório | Tooltip |
|---|---|---|
| Foto do sofá-padrão com a estampa | Sim | "Foto do sofá-padrão da empresa com a estampa aplicada. Define a escala física real do padrão." |
| Foto plana do rolo de tecido | Não (recomendada) | "Foto plana do rolo de tecido em fundo neutro. Melhora a fidelidade de cores e textura. Sem ela, o sistema usa só a foto do sofá." |
| Cenário (foto-template) | Sim (auto via Set) | "Cenário pré-aprovado. Define ambiente, ângulo e iluminação. A IA mantém tudo e substitui apenas a estampa/cor." |

#### → Capa Lisa (qualquer tipo de foto)
| Campo | Obrigatório | Tooltip |
|---|---|---|
| Cor (hex) | Sim | "Cor exata da capa em hex (#RRGGBB). Use o seletor ou digite o código direto." |
| Cenário (foto-template) | Sim (auto via Set) | "Cenário pré-aprovado." |

**Refactoring V1 M1 (18/05/2026):** os prompts Step 2 estão separados em 3 funções (`buildStep2PromptEstampada`, `buildStep2PromptAltoRelevo`, `buildStep2PromptLisa`) em `lib/m1/prompts.ts`, roteadas por `tipoCapa`. Alto Relevo nasce como cópia idêntica de Estampada (output bit-a-bit igual nesta versão) — funções separadas permitem iteração futura sem regressão cruzada.

#### → Foto Elástico
Mesmo input das opções acima. **Não há mais upload de foto bruta de celular.** A cena é o template pré-aprovado.

#### → Detalhe do Tecido
Mesmo input das opções acima. **Não há upload de foto bruta.**
- **Sofá:** 1 cenário (`sofa-detalhe-1`), split-screen — sistema gera close + zoom e compõe lado a lado em 1080×1080 (540×1080 cada metade, sem divisor visual).
- **Cadeira:** 2 cenários (`cadeira-detalhe-1`, `cadeira-detalhe-2`), foto única — render direto via Pipeline A em 1080×1080.

### Prompts base por combinação (a refinar no treinamento)

**Regras gerais para todos os prompts:**
- **Manter intactos:** ambiente, móvel, pose, ângulo, iluminação, sombras da foto-template
- **Substituir apenas:** estampa/cor da capa do móvel
- Resultado deve parecer capa vestida (com volume, dobras, costuras), não pintura/estofado
- Manter realismo fotográfico — não aspecto de render 3D

**Sofá Estampado — Foto Capa:**
> Aplica a estampa da capa de referência sobre o sofá da foto-template. A estampa deve seguir o volume, dobras e iluminação do sofá. As costuras e bordas da capa devem ser visíveis. Textura de tecido deve ser perceptível. O resultado deve parecer uma capa elástica vestida. **Manter inalterados:** ambiente, ângulo, iluminação, móvel.

**Sofá Liso — Foto Capa:**
> Aplica capa lisa na cor [cor] sobre o sofá da foto-template. ATENÇÃO: o resultado deve parecer uma capa de tecido vestida no sofá — com textura de tecido visível, dobras naturais nas bordas e encaixes, definição das costuras/bordas da capa, e sombras suaves seguindo a geometria do móvel. NÃO deve parecer que o sofá foi pintado ou retocado. **Manter inalterados:** ambiente, ângulo, iluminação.

**Cadeira Estampada — Foto Capa:** *(variação do Sofá Estampado com ajustes para formato de cadeira)*

**Cadeira Lisa — Foto Capa:** *(variação do Sofá Liso com ajustes para formato de cadeira)*

> **Status:** prompts base definidos em alto nível. Refinamento acontece na fase de treinamento dos templates, antes da implementação do M1.

### API de geração
- **Principal:** **Flux Kontext [Pro]** (via fal.ai) — edit-by-reference com preservação de regiões não-editadas
- **Decisão:** Flux Kontext escolhido por design natural para o caso de uso (substituir X mantendo o resto). Sem A/B com GPT.
- **Custo:** ~$0.04/imagem fixo
- **Latência:** ~8s (cabe em Vercel Hobby — 10s timeout)

### Cenários de ambiente pré-definidos (M1-Ambientes)
- **3 cenários para sofá** (sala de estar, variações de decoração/cor/ângulo)
- **3 cenários para cadeira** (sala de jantar com mesa, variações)
- **Origem das imagens base:** Rafael já tem as fotos-template (referências enviadas na sessão de planejamento)
- Criados via sub-módulo "Template Creator → M1 Ambientes"
- Defaults: imutáveis pelo usuário
- Custom: excluíveis, criados via Template Creator

### Dimensões
- **Todos os 4 tipos de foto:** 1080×1080 WEBP
- **Detalhe do Tecido (sofá):** composição final 1080×1080 com duas metades 540×1080 (close à esquerda + zoom à direita, sem divisor visual)
- **Detalhe do Tecido (cadeira):** 1080×1080 foto única (sem split)

### Cores e fontes
- **Sem texto** — não aplicar paleta de marca neste módulo

---

## Módulo 2 — Posts Instagram (`/imagens/m2-posts`)

### Objetivo
Gerar imagens estáticas e carrosséis pro Instagram da Charme do Detalhe. Volume: 1–4 posts/dia.

### Abas
| Aba | Descrição | Slides | Custo T1 high |
|---|---|---|---|
| Imagem Única | 1 imagem standalone | 1 | ~$0.19 |
| Carrossel | N slides em paralelo, CTA no último | 2–8 | ~$0.19 × N |

### Princípio técnico — híbrido com 3 templates independentes
O M2 abandonou o "compositing puro" da SPEC ≤v1.5 e adotou estrutura de 3 templates independentes, cada um com pipeline próprio:

| Template | Slug | Pipeline | Status |
|---|---|---|---|
| **Atual_Maio26** | `atual-maio26` | `fal-prompt-puro` via gpt-image-1 tier high | **Ativo (em prod)** |
| **Atual_Maio26_New** | `atual-maio26-new` | `hibrido-compositing` (Sharp/Satori + IA pontual) | **Placeholder oficial** — em construção (Fase 2 wireframes Opus + Fase 3 implementação Code) |
| **Novo_Teste1** | `novo-teste-1` | A definir após T2 ativo | **Placeholder oficial** — a definir (Fase 5) |

**T1 (Atual_Maio26)** = réplica imperfeita do workflow ChatGPT Plus que a equipe usa hoje. Composição inteira (layout, tipografia, footer) fica por conta do gpt-image-1. Aceita variabilidade como trade-off (ver [LIMIT-M2-001] em DIVIDAS).

**T2 (Atual_Maio26_New)** = evolução com controle pixel-preciso via Sharp/Satori. IA fica restrita a gerar elementos isolados (produto, atriz, ícones); layout + tipografia + footer 100% determinísticos. Direção **confirmada** após investigação [INV-M2-001]: nenhum modelo IA público (Recraft V3, Flux Pro 1.1 Ultra, Ideogram V3) substitui gpt-image-1 high em fidelidade de texto pt-BR — diferenciação T2 vs T1 não pode vir de troca de modelo. Pipeline Híbrido é a única solução estrutural viável. Ver [DEC-M2-004].

**T3 (Novo_Teste1, Fase 5)** = direção a definir após T2 ativo.

### Fluxo de uso (T1 em prod)

```
1. Selecionar template (T1 ativo · T2/T3 com badge "Em construção"/"A definir")
2. Escolher aba: Imagem Única / Carrossel
3. Selecionar modo de geração: IA (automático) / Upload de imagens
4. [Apenas T2/T3 quando ativos] Selecionar logo do footer
5. Preencher copy, instruções, CTA (carrossel) e — se modo upload — PNGs + instruções de uso
6. [Gerar]
```

### Campos por aba

**Imagem Única**
| Campo | Tipo | Limites |
|---|---|---|
| Copy do post | textarea (verbatim) | 10–2000 chars |
| Instruções adicionais (modo IA) | textarea opcional | até 500 |
| PNGs de referência (modo IA) | upload | 0–3 |
| PNGs (modo Upload) | upload | 1–8 obrigatórios |
| Instruções de uso das imagens (modo Upload) | textarea | até 800 |

**Carrossel**
| Campo | Tipo | Limites |
|---|---|---|
| Contexto/tema geral | textarea opcional | até 500 |
| Quantidade de slides | select | 2–8 |
| CTA do último slide | textarea (verbatim, em destaque) | 5–300 |
| Por slide: copy | textarea | 10–2000 |
| Por slide: PNGs (modo IA) | upload | 0–3 |
| Por slide: PNGs (modo Upload) | upload | 1–8 obrigatórios por slide |
| Instruções de uso das imagens globais (modo Upload) | textarea | até 800 |

### Modos de geração

- **IA** (default): composição livre via gpt-image-1, opcionalmente com 0–3 PNGs de referência leve.
- **Upload**: 1–8 PNGs obrigatórios + texto livre referenciando cada arquivo por nome. Útil quando IA falha em compor cenas físicas (anatomia, perspectiva).

### Templates e brand

- **Brand config:** `lib/brand/m2.brand.ts` (Montserrat, gradient cyan→roxo, dimensões, faixa de carrossel, logos disponíveis).
- **Logos disponíveis** (consumidos pelo T2/T3 via `LogoSelector`):  `casinha` (default, 90% dos casos), `quadrado`, `3d`, `retangular`.
- **T1 não usa LogoSelector** (decisão pós-smoke 2: gpt-image-1 não respeita pixel-precisamente reserva de footer; IA decide composição inteira).

### Dimensões
- **1080×1350** (4:5 portrait Instagram) — substitui 1080×1080 da SPEC ≤v1.5.
- Output nativo gpt-image-1: 1024×1536 → Sharp resize/crop center pra 1080×1350.

### Custo
- T1 high: ~$0.19/imagem.
- Volume estimado 30-120 posts/mês × média 2 slides = **$4.80–$22.80/mês** (aceito por Rafael — ver [DEC-M2-001]).

### Limitações inerentes do T1
Reforços de prompt mitigam mas NÃO eliminam (ver [LIMIT-M2-001]):
- Falta de continuidade visual entre slides paralelos do carrossel
- Variabilidade ocasional de fundo (escape do gradient apesar de `BACKGROUND ENFORCEMENT`)
- IA pode inventar handles/marcas d'água apesar de `NO BRAND ELEMENTS`
- Hierarquia tipográfica imprecisa apesar de `TYPOGRAPHIC HIERARCHY STRICT`
- Tipografia densa em PT-BR com diacríticos tem variabilidade

Resolução real prevista no T2 via Pipeline Híbrido (Fase 3).

---

## Módulo 3 — Banners Website (`/imagens/m3-banners`)

### Objetivo
Gerar par de banners (desktop + mobile) para o topo da home do e-commerce, trocado mensalmente. Layout padronizado, identidade visual consistente, parametrização total por promoção.

### Princípio técnico — Pipeline Híbrido

100% do layout, tipografia descritiva, BG, card de condições e footer são determinísticos via **Sharp/Satori**. IA é restrita a 2 elementos isolados gerados como PNGs transparentes:
1. **Título 3D balão** — `gpt-image-1 high` parametrizado
2. **Atriz cutout** — Flux Kontext text-to-image OU Upload do user

Decorações (corações, ícones de condições) vêm de banco curado de PNGs cutout (Microsoft Fluent Emoji 3D). Fluxo:

```
INPUT → generateTitulo() → tituloPng
      → generateAtriz() → atrizPng (rembg obrigatório)
      → selectDecoracoes() → array PNGs
      → renderDesktop(1920×550 WEBP)
      → renderMobile(800×600 WEBP)
OUTPUT: 2 WEBPs prontos pra download
```

### Templates V1

| Template | Slug | Status | Pipeline |
|---|---|---|---|
| **Atual_Maio26** | `atual-maio26` | ✅ V1 ativo | Pipeline Híbrido com layout "Descontão de Mãe" |
| **Novo_Teste1** | `novo-teste-1` | ⏳ Placeholder visível na UI | A definir após T1 ativo |
| **Novo_Teste2** | `novo-teste-2` | ⏳ Placeholder visível na UI | A definir após T1 ativo |

Cards T2 e T3 ficam visíveis (disabled) na tela com badge "em construção / a definir" — confirma para a equipe que mais templates virão.

### Dimensões

| Output | Resolução | Formato |
|---|---|---|
| Desktop | 1920 × 550 px | WEBP (quality 90) |
| Mobile | 800 × 600 px | WEBP (quality 90) |

Layouts são **independentes** (não responsivos). Sharp/Satori renderiza 2 vezes, cada um com seu próprio componente layout.

### Inputs (campos do formulário)

| Campo | Obrigatório | Default | Tooltip |
|---|---|---|---|
| Nome da promoção | Sim | — | "Texto principal do banner (ex.: 'DESCONTÃO DE MÃE', 'BOTA FORA CHARME'). Vira título 3D balão." |
| Desconto da promoção | Sim | — | "Texto do desconto (ex.: '35% OFF', 'Até 74% OFF'). Aparece na bola/círculo." |
| "na loja toda" | Checkbox | On | "Texto fixo abaixo do desconto. Desmarque pra remover." |
| Cor primary | Color picker | `#E91E63` | "Cor principal do BG. Domina o gradient." |
| Cor secondary | Color picker | `#C2185B` | "Cor secundária do BG. Aparece nas bordas do gradient e nos detalhes." |
| Cor accent | Color picker | `#7A1640` | "Cor de acento. Usada em outlines, footer, textos de destaque sobre fundo claro." |
| Condições do footer | Multi-checkbox (max 4) | Top 4 on | Lista das 5 condições (ver abaixo) |
| Modo Atriz | Radio | IA | "IA gera atriz a partir de prompt OU usa Upload de PNG sua." |
| → Modo IA: prompt opcional | Textarea | — | "Detalhes adicionais pra atriz (ex.: 'cabelo cacheado', 'óculos'). Opcional. Idade ~35-45 sempre forçada." |
| → Modo Upload: PNG | File input | — | "Upload de PNG da atriz. Fundo será removido automaticamente (rembg). 1 arquivo." |
| Modo Decorações | Radio | Banco | "Banco curado (Fluent Emoji 3D) OU geração IA via Flux." |
| → Modo Banco: seleção | Multi-select | Top 4 (corações) | "Selecione decorações do banco. Default: corações balão." |
| → Modo IA: prompt | Textarea | — | "Descreva decorações desejadas (ex.: 'flores rosa pequenas 3D balão')." |

### Footer — 5 condições padrão (max 4 simultâneas)

| ID | Texto exibido | Ícone | Default |
|---|---|---|---|
| `12x-cartao` | "Pague em até 12x no cartão" | cartão | ✅ on |
| `frete-gratis` | "FRETE GRÁTIS*" (com 2 subitens *Sul/Sudeste acima R$200 · Outras regiões acima R$299,90*) | presente | ✅ on |
| `cashback` | "CASHBACK garantido na próxima compra" | dinheiro | ✅ on |
| `entrega-rapida` | "Entrega Rápida em todo Brasil" | foguete | ✅ on |
| `entrega-turbinada` | "Entrega TURBINADA Liberada" | foguete | off |

UI valida limite: ao selecionar 5ª, desmarcar uma. Mensagem: "Máximo 4 condições por banner."

### Layout pixel-preciso — Desktop 1920×550

| Elemento | Posição | Detalhes |
|---|---|---|
| BG gradient | 0,0 — 1920,550 | linear esquerda→direita: `secondary` (0%) → `primary` (50%) → `accent darken` (100%) |
| Waves brancas | 3 paths SVG | opacity 6-10%, posições topo/meio/bottom |
| Corações decorativos | ~6-10 PNGs | espalhados, posições fixas no layout |
| Título PNG (gpt-image-1) | `<image>` em x=80, y=80, w=600, h=370 | placeholder area; PNG contém DESCONTÃO + DE + MÃE em 3 linhas |
| Círculo desconto | cx=675, cy=445, r=115 | radial gradient `secondary lightened` → `primary`, stroke `secondary` 4px |
| → Texto "Até" | x=675, y=410, anchor middle | Montserrat 700, 32px, branco |
| → Texto desconto (ex: "38% OFF") | x=675, y=460 | Montserrat 800, 52px, branco |
| → Texto "na loja toda" | x=675, y=495, italic | Montserrat 600, 22px, branco |
| Card condições | x=800, y=90, w=600, h=380, rx=36 | gradient `cardBg` (rosa claro), stroke 2px |
| → Divisores internos | linhas 1.5px | vertical em x=1100, horizontal em y=280 |
| → Grid 2×2 ícones+textos | quadrantes 290×175 | ícones ~70-80px, textos Montserrat 700/800 |
| Atriz PNG cutout | `<image>` em x=1480, y=20, w=440, h=520 | placeholder area; PNG contém atriz isolada |
| Speed lines | linhas brancas curtas | opcionais, 3-4 traços perto da atriz |
| Footer asterisco | x=960, y=525, anchor middle | Montserrat 600, 24px, branco |

### Layout pixel-preciso — Mobile 800×600

| Elemento | Posição | Detalhes |
|---|---|---|
| BG gradient | 0,0 — 800,600 | linear diagonal: `secondary` → `primary` → `accent darken` |
| Waves brancas | 3 paths | opacity 6-10% |
| Corações decorativos | ~7-9 PNGs | espalhados |
| Título PNG | `<image>` em x=20, y=50, w=380, h=210 | DESCONTÃO + DE + MÃE em 3 linhas |
| Círculo desconto | cx=420, cy=190, r=95 | sobreposta parcialmente ao MÃE à direita |
| → Texto "Até" | x=420, y=165 | Montserrat 700, 22px, branco |
| → Texto desconto | x=420, y=208 | Montserrat 800, 40px, branco |
| → Texto "na loja toda" | x=420, y=238, italic | Montserrat 600, 17px, branco |
| Card condições | x=30, y=295, w=480, h=240, rx=24 | grid 2×2 compacto |
| → Ícones | ~50px | menores que desktop |
| → Textos | Montserrat 700/800, 13-20px | |
| Atriz PNG cutout | `<image>` em x=480, y=80, w=320, h=480 | scale 0.95 |
| Speed lines | 4-6 traços brancos | 2 perto da atriz, 2 no bottom-left |
| Footer asterisco | x=30, y=565+585, anchor start | Montserrat 600, 15px, branco, 2 linhas alinhadas esquerda |

### Pipeline do título 3D

Endpoint: `fal-ai/gpt-image-1/text-to-image`
Quality: `high`
Size: `1536x1024`
Background: `transparent`

**Prompt parametrizado (`buildTituloPrompt(texto: string)`):**

```
3D inflated balloon typography, chrome-like glossy highlights, white body with magenta double outline, exact text: '${texto}'. Transparent background, no scene, no decorations, isolated typographic element only. Portuguese language. DO NOT misspell, DO NOT add extra letters, DO NOT translate to English, DO NOT add background elements, DO NOT add hearts or shapes around the text.
```

Validado em smoke (19/05/2026) com 5 textos: "DESCONTÃO DE MÃE", "BOTA FORA CHARME", "SAÍDEIRA 2024" — todos com fidelidade tipográfica PT-BR (acentos corretos), efeito 3D balão consistente, PNG transparente real.

**Custo:** ~$0.20-0.25/título. Cache: chave = texto normalizado (uppercase + trim). Banner é mensal, reuso de cache praticamente garantido se mesma promo regenerada.

### Pipeline da atriz

**Modo IA (Flux Kontext text-to-image):**
- Endpoint: `fal-ai/flux-pro/v1.1` (a confirmar na Fase 2 — endpoint mais barato pra text-to-image isolado)
- Prompt base: `"Professional portrait photo of a Brazilian woman aged 35-45, friendly smile, hands gracefully near the face, wearing simple white blouse, neutral expression of happiness, soft studio lighting, photorealistic, isolated subject on plain background (background will be removed). ${detalhesUsuario || ''}"`
- Output: PNG → rembg automático (`fal-ai/imageutils/rembg`) → atrizPng transparente
- Custo: ~$0.045 (Flux) + $0.005 (rembg) = $0.05

**Modo Upload:**
- User faz upload de PNG
- Se PNG já transparente (alpha channel detectado): usa direto
- Se não transparente: rembg automático
- Custo: $0 ou $0.005

### Pipeline de decorações

**Banco curado (Microsoft Fluent Emoji 3D):**
- Repositório: https://github.com/microsoft/fluentui-emoji
- Versão usada: 3D (PNG transparente, 256×256 ou 512×512)
- Curadoria inicial M3 V1 (10-15 assets em `public/brand/m3/decoracoes/`):
  - `coracao-rosa.png` (heart-3d, color shifted)
  - `coracao-vermelho.png`
  - `coracao-balao.png` (heart-decoration)
  - `foguete.png` (rocket)
  - `presente.png` (wrapped-gift)
  - `cartao.png` (credit-card)
  - `dinheiro.png` (dollar-banknote)
  - `papai-noel.png` (santa)
  - `flor.png` (cherry-blossom)
  - `estrela.png` (star)
  - `confete.png` (confetti)
  - `coroa.png` (crown)
  - `presente-azul.png`

**Modo IA fallback (Flux):**
- Quando banco curado não cobre, user descreve via prompt
- Endpoint: `fal-ai/flux-pro/v1.1` ou similar
- Output: PNG → rembg → asset transparente
- Custo: ~$0.05/asset

### Estimativa de custo mensal

| Item | Custo |
|---|---|
| Título (1 por banner) | ~$0.22 |
| Atriz IA (se modo IA) | ~$0.05 |
| Atriz Upload | ~$0.005 |
| Decorações banco | $0 |
| Decorações IA (eventual) | ~$0.05 cada |
| **Total por banner par (modo IA atriz)** | **~$0.27** |
| **Total por banner par (modo Upload atriz)** | **~$0.22** |

Volume base: 1-2 banners/mês = **~$0.30-1.00/mês**. Cache do título reduz ainda mais quando regenera.

### Output e UX

Após clicar Gerar:
1. Loading state com etapas visíveis ("Gerando título...", "Gerando atriz...", "Compondo banner desktop...", "Compondo banner mobile...")
2. Preview lado a lado dos 2 WEBPs
3. Botões "Fazer Download Desktop" e "Fazer Download Mobile"
4. Sem histórico — fechou aba, perdeu (padrão do sistema)

### Pendências M3 V1 abertas

- [ ] Curadoria final das 15 decorações default (Fase 2)
- [ ] Definir endpoint Flux exato pra atriz e decorações IA fallback (Fase 2)
- [ ] Confirmar gradient exato do BG paramétrico vs cores Brand (Fase 2)
- [ ] T2 e T3 — direção a definir após T1 ativo

---

## Módulo 4 — Thumbnails Feed Instagram (`/imagens/m4-thumbnails`)

### Objetivo
Gerar thumbnails padronizados para vídeos do feed/reels do Instagram. Processo simples: print do frame + sobreposição de bloco de texto (2 ou 3 caixas coloridas) + emoji 3D + florzinha decorativa.

### Princípio técnico
**Sem IA de geração.** Compositing puro via Sharp.js + Satori (HTML/CSS → PNG). Zero custo de API.

### Fluxo de uso

```
PASSO 1: Selecionar template
  [V1 Topo]  /  [V2 Centro-alto]  /  [V3 Centro]  /  [V4 Centro-baixo]  /  [V5 Rodapé]  /  [Custom ...]

PASSO 2: Upload do frame do vídeo
  Print/screenshot já escolhido pela equipe (não extrai do vídeo)

PASSO 3: Preencher campos de texto (2 ou 3 linhas, conforme template)

PASSO 4: Escolher ícone (emoji 3D curado ou PNG próprio)

PASSO 5: (Opcional) Campo Customização / Ideia

PASSO 6: [Gerar]
```

### Campos de texto

**Campo Customização / Ideia (opcional)**
- Tooltip: *"Ajustes de tratamento da imagem. Ex: 'aumentar brilho', 'mais contraste'. Aplicado no frame antes do compositing."*

**Campos Texto a Risca**

| Sub-campo | Limite | Tooltip |
|---|---|---|
| Linha 1 — caixa branca | 24 chars | *"Texto principal, exibido em caixa branca com letras escuras. Será exibido exatamente como digitado."* |
| Linha 2 — caixa roxa | 22 chars | *"Texto secundário, exibido em caixa roxa com letras brancas. Será exibido exatamente como digitado."* |
| Linha 3 — caixa verde *(só V2 e V4)* | 18 chars | *"Terceiro texto (só nos templates Centro-alto e Centro-baixo), exibido em caixa verde com letras escuras."* |

**Campo Ícone final**
- Tooltip: *"Emoji 3D que aparece ao final da última linha de texto. Escolha um da lista ou envie um PNG próprio (até 200KB, fundo transparente)."*
- Curadoria: **30 emojis 3D** do Microsoft Fluent Emoji (CDN), agrupados em 6 categorias: urgência, casa/limpeza, emoções, destaque, decorativo, ação.
- Alternativa: upload PNG próprio (transparência preferida, ≤200KB).

### Templates disponíveis — 5 variações posicionais

| Variação | Posição | Linhas |
|---|---|---|
| **V1 — Topo** | Terço superior | 2 |
| **V2 — Centro-alto** | Acima do meio | 3 |
| **V3 — Centro** | Meio exato | 2 |
| **V4 — Centro-baixo** | Abaixo do meio | 3 |
| **V5 — Rodapé** | Terço inferior | 2 |

**Estilo visual fixo (todas as variações):**
- Linha 1 — caixa **branca** `#FEFEFC` com texto escuro `#1A1A1A`
- Linha 2 — caixa **roxa** `#553679` com texto branco `#FEFEFC`
- Linha 3 — caixa **verde** `#4CDDC3` com texto escuro `#1A1A1A` *(só V2 e V4)*
- **Rotação do bloco inteiro:** −2,5°
- **Florzinha verde** decorativa no canto superior direito da Linha 1
- **Emoji 3D** ao final da última caixa (Microsoft Fluent ou PNG próprio)
- Fonte: **Tinos** (Google Fonts, Apache 2.0 — clone métrico open-source do Times). Self-hosted em `public/fonts/Tinos-{Regular,Bold}.ttf`.

**Custom:** criados via Template Creator → M4 Layouts.

### Cores e fontes
- **Fonte:** Tinos (Google Fonts, Apache 2.0)
- **Paleta fixa:** `#FEFEFC` / `#553679` / `#4CDDC3` (+ texto escuro `#1A1A1A` sobre caixas claras)

### Dimensões
- **1080×1920px** (formato vertical 9:16 — Reels/Stories)

### Inputs da equipe
- A equipe entrega o **print do frame já selecionado** — o sistema não faz extração de vídeo.

---

## Módulo 5 — Banners Emails (`/m5-banners-email`)

**Status:** Placeholder. 100% a definir em sessão futura.

**Contexto registrado:**
- Ferramenta de email marketing: **Edrone**
- Posição na ordem de implementação: **penúltimo módulo**

**Tudo abaixo a definir:**
- Objetivo detalhado
- Subtipos / variações
- Princípio técnico (compositing puro ou IA)
- Fluxo de uso
- Inputs e campos
- Templates default
- Dimensões
- Paleta e fontes
- API de geração (se aplicável)

---

## Módulo 6 — Imagens Ads (`/m6-ads`)

**Status:** Placeholder. 100% a definir em sessão futura.

**Contexto registrado:**
- Posição na ordem de implementação: **último módulo** (após M5)

**Tudo a definir:**
- Objetivo detalhado (criativos pra Meta Ads, Google Ads, TikTok Ads?)
- Subtipos / variações (estático, vídeo curto, formato vertical/quadrado?)
- Princípio técnico
- Fluxo de uso
- Inputs e campos
- Templates default
- Dimensões (provavelmente múltiplas por plataforma)
- Paleta e fontes
- API de geração (se aplicável)

---

## Template Creator (`/template-creator`)

### Objetivo
Painel para criar novos templates customizados que se integram nativamente aos módulos. Possui 2 sub-módulos.

### Sub-módulo 1 — Layouts (`/template-creator/m2-layouts`, `/m3-layouts`, `/m4-layouts`, `/m5-layouts` *a definir*)

**Função:** Analisar exemplos visuais de layouts e gerar nova definição de template para uso em M2, M3, M4 (e futuramente M5).

**Fluxo:**
```
PASSO 1: Selecionar módulo de destino
  [M2 Posts]  /  [M3 Banners]  /  [M4 Thumbnails]  /  [M5 Email - a definir]

PASSO 2: Upload de 1–3 exemplos de referência
  (pode ser concorrente, inspiração, template externo)

PASSO 3: [Analisar]
  Claude API analisa: paleta, layout zones, hierarquia tipográfica,
  elementos decorativos, posicionamento

PASSO 4: Sistema gera definição JSON do template
  Preview visual exibido para aprovação

PASSO 5: [Salvar como Custom] ou [Descartar]
```

**Regras críticas de geração:**
- Cores e fontes do template gerado são **sempre** as da Charme do Detalhe (do brand config do módulo de destino), não as do exemplo de referência
- O que se herda da referência: estrutura de layout, disposição de zonas, estilo de composição
- O que NÃO se herda: paleta de cores, fontes, identidade de outra marca

### Sub-módulo 2 — Ambientes Produto (`/template-creator/m1-ambientes`)

**Função:** Criar novos cenários de ambiente para uso como fundo nas fotos de capa do M1.

**Fluxo:**
```
PASSO 1: Selecionar tipo de ambiente
  [Sofá]  /  [Cadeira]

PASSO 2: Upload de 1–3 referências de ambiente
  (foto de ambiente desejado, revista, concorrente, etc.)

PASSO 3: Descrever o ambiente desejado (campo livre)
  Tooltip: "Descreva o ambiente: tipo de cômodo, cores de parede,
  iluminação, estilo de decoração, posição do móvel.
  Quanto mais detalhado, melhor o resultado."

PASSO 4: [Gerar ambiente]
  Flux Kontext gera o cenário base (com móvel posicionado e capa neutra)

PASSO 5: Preview + [Salvar como Custom] ou [Refinar] ou [Descartar]
```

**Uso:** ambiente gerado é salvo em `/templates/custom/m1-ambientes/` e aparece como opção de seleção no M1 — Foto Capa.

**Atenção — Foto Capa apenas:** os ambientes criados aqui são usados **exclusivamente para Foto Capa**. Foto Ambiente (Outra 1) tem seu próprio fluxo.

---

## Gestão de Templates — Regras Gerais

| Operação | Default | Custom |
|---|---|---|
| Visualizar | ✅ | ✅ |
| Usar para gerar | ✅ | ✅ |
| Editar | ❌ (só via código) | ❌ |
| Excluir (individual) | ❌ | ✅ |
| Limpar tudo (custom) | N/A | ✅ com confirmação |

**"Limpar Tudo":**
- Botão disponível no painel de cada módulo dentro do Template Creator
- Confirmação obrigatória: *"Isso vai excluir TODOS os templates criados neste módulo. Esta ação não pode ser desfeita. Continuar?"*
- Zera 100% de `/templates/custom/[módulo]/`
- Não afeta `/templates/defaults/`

---

## UX / Frontend — Especificação Geral

### Princípios
- **Ferramenta de trabalho**, não produto de marketing — limpeza e eficiência acima de estética
- **Não técnica** — usuários são de marketing, não de TI
- **Rápida** — lazy loading, sem espera entre trocas de módulo
- **Explicativa** — todo campo tem tooltip "?" que aparece ao hover/tap

### Tooltip "?" — Padrão
- Ícone de interrogação ao lado de todo campo de input
- Texto curto e direto: o que o sistema espera, formato ideal, exemplo
- Definição completa de todos os tooltips: neste documento (SPEC.md), seção de cada módulo

### Home / Dashboard (`/`)
- Lista dos módulos ativos com ícone e descrição de uma linha
- Acesso ao Template Creator
- Login/logout do usuário
- Nenhum dado sensível na home

### Feedback ao usuário
- Estado de loading claro durante processamento ("Gerando imagem...")
- Estimativa de tempo onde possível
- Erro descritivo e acionável (não "Error 500")
- Preview da imagem gerada com botão **"Fazer Download"**

---

## Brand — Identidade Visual Consolidada

### Paleta oficial Charme do Detalhe

| Token | Hex | Uso |
|---|---|---|
| `primaryDark` | `#553679` | Roxo escuro — primária, títulos M4 |
| `primaryLight` | `#9569C8` | Roxo claro — secundária |
| `cta` | `#4CDDC3` | Verde — CTA, títulos M2, detalhes M4 |
| `white` | `#FEFEFC` | Branco — textos sobre fundo escuro |

### Logo
- Formato: SVG único
- Versão: monocromática/quadrada (estilo favicon — "casinha")
- Usada em quase todos os templates onde aplica logo
- Local no projeto: `/public/brand/logo.svg`

### Fontes por módulo

| Módulo | Fonte | Observação |
|---|---|---|
| M1 | — | Sem texto |
| M2 | Montserrat | Todos os pesos |
| M3 | Montserrat | Todos os pesos |
| M4 | Tinos | Apache 2.0 (Google Fonts); self-hosted |
| M5 | TBD | A definir |

---

## Pendências Abertas

### Bloqueantes para detalhamento do próximo módulo (M4)
- Nenhuma — pronto para iniciar detalhamento técnico do M4

### Pendências por módulo

**M1:**
- [ ] Confirmação visual final das 6 fotos-template (3 sofá + 3 cadeira) — Rafael já tem as imagens; ajuste fino da imagem do Sofá 2 (remover overlay circular)
- [ ] Refinamento dos prompts base por combinação (na fase de treinamento)

**M3:**
- [ ] **Dimensões exatas desktop e mobile** — aguardando confirmação do time
- [ ] Especificação detalhada das 3 variações default

**M4:**
- [ ] SVG definitivo da florzinha decorativa (placeholder atual em `public/brand/florzinha.svg`)
- [x] Resolução DEC-003 — substituída por Tinos (Apache 2.0)
- [x] Especificação pixel-perfect das 5 variações — Bloco C definido e implementado

**M5:**
- [ ] 100% a definir em sessão futura
- [ ] Integração com Edrone (formato esperado pela ferramenta)

### Resolvidas nesta versão (v0.2)
- [x] Cores hex da marca — definidas e consolidadas
- [x] Fontes por módulo — definidas (M5 pendente)
- [x] Logo — SVG único confirmado
- [x] Autenticação — login + senha por usuário
- [x] Histórico — sem histórico, botão download por geração
- [x] M1: input "foto do móvel sem capa" removido
- [x] M1: decisão IA — Flux Kontext [Pro] como principal (sem A/B)
- [x] M1: dimensões 1080×1080
- [x] M4: 3 variações posicionais (topo/centro/rodapé)
- [x] M4: dimensões 1080×1920
- [x] M5: adicionado como placeholder

---

## Changelog

### v1.7 — 18/05/2026 (M2 V1 fechado · investigação modelos IA T2 encerrada · T2/T3 placeholder oficial)
- **Investigação de modelos IA alternativos pro T2 encerrada** (ver [INV-M2-001] em DIVIDAS). Três modelos testados via FAL — Recraft V3 ($0.04), Flux Pro 1.1 Ultra ($0.06), Ideogram V3 QUALITY ($0.10) — todos reprovaram o critério crítico de fidelidade de texto pt-BR. Custo total investigação: $0.32.
- **Decisão fechada:** T2 oficialmente placeholder até Fase 2 (wireframes Opus) + Fase 3 (implementação Code). Direção é **Pipeline Híbrido** (Sharp/Satori controla 100% do texto + IA gera apenas elementos visuais isolados) — única forma estrutural de garantir tipografia pt-BR pixel-perfeita e diferenciar T2 do T1. Ver [DEC-M2-004].
- **gpt-image-1 high** confirmado como único modelo IA público com tipografia pt-BR aceitável. T1 permanece com este modelo.
- **T3 Novo_Teste1** permanece placeholder oficial — direção será definida após T2 ativo.
- **M2 V1 entregue** com T1 ativo, hotfixes v6/v8 aplicados, BUG-M2-001 conhecido (workaround manual), LIMIT-M2-001 documentado.

### v1.6 — 18/05/2026 (M2 Fase 1 fechada · T1 em prod · M6 placeholder)
- **Header version**: salto de v0.4 → v1.6 (header estava desatualizado; corrige inconsistência).
- **M2 reescrito:** estrutura híbrida com 3 templates independentes (T1 ativo, T2/T3 placeholders). Princípio "compositing puro" da SPEC ≤v1.5 substituído por estrutura por-template.
- **M2 dimensões:** 1080×1350 (4:5 portrait) substitui 1080×1080.
- **M2 carrossel:** 2-8 slides (era 3-5), CTA final livre como campo separado.
- **M2 modos:** novo radio IA / Upload de imagens (Upload exige 1-8 PNGs + instruções de uso por nome).
- **M2 T1 (Atual_Maio26):** `fal-prompt-puro` via gpt-image-1 tier high (~$0.19/img). Réplica imperfeita do ChatGPT Plus. Limitações registradas em [LIMIT-M2-001].
- **M2 footer:** decisão Rafael pós-smoke 2 — T1 sem footer programático (gpt-image-1 não respeita reserva pixel-precisa). Footer 100% controlado reservado pro T2.
- **M6 — Imagens Ads** adicionado como placeholder (100% a definir, igual M5).
- **Commit:** `9c32313 feat(m2): fase 1 fechada — T1 prompt v5 (anti-handle + bg enforcement + hierarquia strict)`.

### v0.4 — 13/05/2026 (Tinos + Bloco C)
- **Fonte M4:** trocada de Times New Roman MT (Monotype, licenciada) para **Tinos** (Google Fonts, Apache 2.0, clone métrico open-source). DEC-003 resolvida.
- **Implementação M4:** render real pixel-perfect implementado em `lib/m4/render.tsx` (Sharp + Satori). Stub removido.
- **Especificação pixel-perfect M4:** canvas 1080×1920, margens 80px, caixas 112px altura (padding 32×16), radius 8px, gap 8px, fonte Tinos Bold 80px, rotação −2,5°, florzinha 80×80 (canto sup direito L1, offset −15/−15), emoji 110px ao final da última caixa com gap 12px.

### v0.3 — 13/05/2026 (M4 detalhado)
- **M4:** templates default redefinidos — agora **5 variações posicionais** (topo / centro-alto / centro / centro-baixo / rodapé) em vez de 3
- **M4:** V2 (Centro-alto) e V4 (Centro-baixo) suportam **3 linhas de texto**; V1, V3, V5 suportam 2 linhas
- **M4:** paleta de caixas redefinida — L1 branca, L2 roxa, L3 verde (era L1 roxa + L2 verde)
- **M4:** adicionado **emoji 3D** ao final da última caixa (30 emojis curados do Microsoft Fluent Emoji + opção PNG próprio)
- **M4:** adicionada **florzinha decorativa verde** no canto superior direito da Linha 1
- **M4:** rotação do bloco inteiro: **−2,5°**
- **M4:** limites de caracteres por linha definidos: 24 / 22 / 18
- **M4:** rota atualizada de `/m4-thumbnails-feed` para `/imagens/m4-thumbnails`
- **Fonte M4:** `serif` como fallback temporário enquanto DEC-003 (licença Times New Roman MT) não é resolvida

### v0.2 — 13/05/2026 (sessão de consolidação)
- **Brand:** paleta consolidada e padronizada com cores oficiais do site (`#553679`, `#9569C8`, `#4CDDC3`, `#FEFEFC`)
- **Brand:** fontes por módulo definidas (Montserrat M2/M3, Times New Roman MT M4)
- **Brand:** logo SVG único confirmado
- **Auth:** sistema multi-user com login + senha por usuário
- **Histórico:** confirmado sem histórico, botão "Fazer Download" por geração
- **M1:** fluxo simplificado — móvel vem da foto-template, não é mais input do usuário
- **M1:** input "foto do móvel (celular) sem capa" REMOVIDO
- **M1:** decisão de IA — Flux Kontext [Pro] como principal, sem A/B com GPT
- **M1:** dimensões confirmadas (1080×1080)
- **M3:** modelo atualizado para GPT Image 2 (era GPT-4o Image Edit)
- **M4:** 3 variações default definidas como posicionais (topo/centro/rodapé)
- **M4:** paleta corrigida para cores oficiais (`#553679`, `#4CDDC3`, `#FEFEFC`)
- **M4:** dimensões confirmadas (1080×1920)
- **M5:** adicionado como módulo placeholder — banners para emails via Edrone, 100% a definir

### v0.1 — 12/05/2026
- Versão inicial do planejamento
