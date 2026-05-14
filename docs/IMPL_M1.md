# IMPL_M1.md
## Documento de Implementação — Submódulo M1 (Foto Produto Vitrine)

**Versão:** 1.3 (lógica de Sets — usuário escolhe Set 1 ou 2, sistema resolve template)
**Data:** 15/05/2026 (v1.0 14/05, v1.1 14/05 DEC-006, v1.2 15/05, v1.2.1 15/05, v1.3 15/05)
**Tipo:** Doc temporário — apagar após implementação concluída
**Destinatário:** Claude Code (Sonnet)
**Pré-requisito:** Base do sistema + M4 já implementados e funcionais

> **Changelog v1.2.1 → v1.3 (15/05/2026):** lógica de Sets.
> - **Cada (móvel, tipoFoto) tem até 2 templates**, indexados por `set: 1 | 2`. Distribuição:
>   Set 1 = todos `-1`; Set 2 = todos `-2`.
> - **Usuário escolhe Set uma vez** (cards `Set 1` e `Set 2` com preview = thumbnail da capa do Set).
>   Sistema resolve o template real via `getTemplate(movel, tipoFoto, set)`.
> - **Fallback documentado:** Sofá Detalhe Tecido só existe no Set 1 (split). Pedir
>   `(sofa, detalhe-tecido, 2)` retorna silenciosamente `sofa-detalhe-1`.
> - **Schema migra `cenarioId` → `set`**. Cenário deixa de ser input explícito; passa
>   a ser derivado de `(movel, tipoFoto, set)` via helper.
> - **UI:** `step-cenario.tsx` removido; `step-set.tsx` novo. Ordem dos steps:
>   Móvel → Set → Tipo Capa → Tipo Foto → Upload/Cor → Gerar.
>
> **Changelog v1.2 → v1.2.1 (15/05/2026):** ajuste pós-reescrita.
> - Split-screen só em **Sofá Detalhe Tecido** (`sofa-detalhe-1` mantém variant=split).
> - **Cadeira Detalhe Tecido** vira foto única (variant=simple) com **2 variações de cenário**:
>   `cadeira-detalhe-1` e `cadeira-detalhe-2` — ambos simples.
> - Roteamento em `lib/m1/render.ts` agora considera `template.variant`: só roda
>   `renderPipelineDetalhe` quando tipoFoto=detalhe-tecido E variant=split.
> - Total: **14 → 15 templates lógicos** (16 imagens físicas, mesmo número).
>
> **Changelog v1.1 → v1.2 (15/05/2026):** reescrita arquitetural após sessão com Rafael.
> - **Pipeline B eliminado.** Todos os 4 tipos (capa, ambiente, elástico, detalhe-tecido)
>   usam o Pipeline A com template + cenário pré-aprovado.
> - **Templates: 11 → 14.** Reduzido capa (3→2) e cadeira-ambiente (3→2); adicionado
>   elástico (2 por móvel) e detalhe-tecido (1 split por móvel).
> - **Sem upload de foto bruta.** Elástico e detalhe usam template (não cleanup).
> - **Capa Lisa:** novo subfluxo pula Step 1 — Step 2 só com prompt de cor HEX.
> - **Detalhe Tecido:** novo orquestrador `render-pipeline-detalhe.ts` roda Pipeline A 2×
>   (close + zoom) e compõe side-by-side via Sharp em canvas 1080×1080.
> - **brandM1.dimensions:** consolidado em `final: 1080×1080` + `detalheHalf: 540×1080`.
> - **NOTA:** os blocos de código nas seções 5–13 deste doc refletem v1.0/v1.1.
>   O código fonte em `lib/m1/` e `app/imagens/m1-vitrine/` é a fonte de verdade
>   pós-v1.2. Atualizações pontuais ao texto narrativo abaixo refletem v1.2.
>
> **Changelog v1.0 → v1.1:** descoberto durante migração para `@fal-ai/client@1.x`
> que `fal-ai/flux-pro/kontext` aceita apenas `image_url + prompt` (sem `mask_url`/
> `reference_image_url`). Step 2 do Pipeline A migrado para
> `fal-ai/flux-kontext-lora/inpaint`, que aceita `image+mask+reference+prompt` no
> tipo oficial `BaseKontextInpaintInput`. Resolve DEC-006.

---

## 0.1. Lógica de Sets (v1.3)

Cada móvel tem **2 Sets** (estéticas/cenários distintos). O usuário escolhe Set 1 ou Set 2 **uma única vez** e o sistema resolve automaticamente o template correto via:

```
getTemplate(movel, tipoFoto, set) → M1Template
```

**Distribuição:**
- **Set 1:** todos os IDs terminados em `-1` (`sofa-capa-1`, `sofa-ambiente-1`, `sofa-elastico-1`, `sofa-detalhe-1`, `cadeira-*-1`)
- **Set 2:** todos os IDs terminados em `-2` (`sofa-capa-2`, `sofa-ambiente-2`, `sofa-elastico-2`, `cadeira-*-2`)

**Fallback documentado:** Sofá Detalhe Tecido só existe no Set 1 (split close+zoom). Quando o usuário pede `(sofa, detalhe-tecido, 2)`, `getTemplate` retorna silenciosamente `sofa-detalhe-1`. Razão: fotografar duas variações de split-screen seria caro; a coerência do Set 2 já está garantida pelos outros 3 tipos de foto.

**Fluxo de UI:**
```
1. Tipo móvel (Sofá / Cadeira)
2. Set (1 / 2) — cards com preview = thumbnail da capa do Set
3. Tipo capa (Estampada / Lisa / Alto Relevo)
4. Tipo foto (Capa / Ambiente / Elástico / Detalhe)
5. Upload referência (ou color picker se Lisa)
6. Gerar
```

---

## 0. Visão Geral e Escopo

Este documento contém todas as instruções para implementar o submódulo **M1 — Foto Produto Vitrine** dentro do módulo Geração de Imagens.

### O que o M1 faz
Gera fotos profissionais de produto (sofá/cadeira com capa) substituindo apenas a estampa/cor da capa em cenários pré-aprovados. **Sem foto bruta de celular** — todos os 4 tipos partem de templates pré-aprovados (DEC-005, v1.2).

### Pipeline técnico (v1.2)
- **Foto Capa / Foto Ambiente / Foto Elástico:** Grounded-SAM (masks pré-geradas) + Flux Kontext em **2-step com cache** + Sharp WEBP (Pipeline A).
- **Foto Detalhe do Tecido:** orquestrador `render-pipeline-detalhe.ts` chama Pipeline A 2× (close + zoom), Step 1 (swatch) reaproveitado via cache LRU, depois Sharp compõe side-by-side em canvas 1080×1080.
- **Capa Lisa:** subfluxo que pula o Step 1 e chama o Step 2 só com prompt de cor HEX (sem `reference_image_url`).

### O que ESTÁ neste doc
- Setup de dependências e env vars
- Brand config M1
- Estrutura completa do submódulo (UI + API + lib)
- Schema Zod, definição dos 15 templates default (v1.2.1) — 14 simple + 1 split
- Lógica de Sets (v1.3): helper `getTemplate(movel, tipoFoto, set)` com fallback documentado
- Pipeline 2-step com cache de capa neutra
- Script de geração de masks (utility)
- Prompts em EN com comentários PT-BR (10 prompts ativos)
- 14 tooltips finais
- Checklist de validação

### O que NÃO está
- Refinamento fino dos prompts (acontece na fase de treinamento manual)
- Implementação do M2, M3, M5 e Template Creator (módulos futuros)

### Antes de começar
Ler nesta ordem:
1. `docs/SESSION_HANDOFF.md` — estado atual após Base + M4
2. `docs/DIVIDAS_PROJETO.md` — pendências e decisões (atenção a DEC-005 e DEC-004)
3. `docs/CLAUDE.md` — convenções (já lido na implementação anterior, revisitar)
4. Este arquivo

### Princípio geral
- **Qualidade > simplicidade.** M1 é o módulo de maior valor visual — pipeline 2-step é não-negociável.
- **Evitar retrabalho.** Decidimos 2-step universal pra TODOS os tipos. Não criar exceções.

---

## 1. Pré-requisitos Já Atendidos

✅ Base do sistema deployada e funcional (auth, layout, dashboard)
✅ M4 implementado (validação pendente, mas não bloqueia M1)
✅ Vercel Pro contratado (necessário pro timeout de 60s do pipeline 2-step) — **CONFIRMAR**

## 2. Novas Dependências e Env Vars

### 2.1 Env vars novas (adicionar ao Vercel Dashboard + `.env.example`)

```env
# fal.ai — usada por Grounded-SAM-2 e Flux Kontext
FAL_KEY=sua-chave-fal-ai
```

Rafael provisiona em https://fal.ai → Dashboard → API Keys. Sem chave, M1 não funciona.

### 2.2 Dependências novas

```bash
# Cliente fal.ai
pnpm add @fal-ai/serverless-client

# Cache em memória para capa neutra
pnpm add lru-cache
```

Sharp e Vercel Blob já estão instalados do M4.

---

## 3. Brand Config — `lib/brand/m1.brand.ts`

```typescript
import { brandBase } from './base.config'

export const brandM1 = {
  ...brandBase,
  // M1 não usa texto nem paleta de marca
  dimensions: {
    fotoCapa:           { width: 1080, height: 1080 },
    fotoAmbiente:       { width: 1080, height: 1080 },
    fotoElastico:       { width: 1080, height: 1080 },
    fotoDetalheTecido:  { width: 1080, height: 1080 },
  },
  cache: {
    capaNeutra: {
      ttlMinutes: 30,           // expira após 30 min sem uso
      maxEntries: 50,           // máx 50 capas neutras em cache simultâneo
    },
  },
  pipeline: {
    timeoutMs: 60_000,          // Vercel Pro: 60s
    falModels: {
      groundedSam: 'fal-ai/grounded-sam-2',                  // mask offline
      fluxKontext: 'fal-ai/flux-pro/kontext',                // Step 1 + Pipeline B
      fluxKontextInpaint: 'fal-ai/flux-kontext-lora/inpaint', // Step 2 do Pipeline A
    },
  },
} as const

export type BrandM1 = typeof brandM1
```

---

## 4. Estrutura de Pastas

```
app/imagens/m1-vitrine/
├── page.tsx
└── _components/
    ├── m1-form.tsx                      # orquestrador (Client Component)
    ├── tab-tipo-movel.tsx               # Sofá / Cadeira
    ├── step-tipo-capa.tsx               # Estampada / Lisa / Alto Relevo
    ├── step-tipo-foto.tsx               # Capa / Ambiente / Elástico / Detalhe Tecido
    ├── step-cenario.tsx                 # cards visuais (só Capa/Ambiente)
    ├── step-upload-referencia.tsx       # upload (label varia por tipo foto)
    ├── step-customizacao.tsx            # textarea opcional
    ├── generate-button.tsx
    └── preview-area.tsx

app/api/imagens/m1/render/route.ts

lib/m1/
├── schema.ts                            # Zod payload + tipos
├── templates.ts                         # definições dos 11 cenários
├── prompts.ts                           # prompts EN com comentários PT
├── render.ts                            # orquestrador do pipeline
├── render-pipeline-a.ts                 # Capa + Ambiente (2-step com cache)
├── render-pipeline-b.ts                 # Elástico + Detalhe Tecido (cleanup)
├── fal-client.ts                        # wrapper Flux Kontext + Grounded-SAM
└── cache.ts                             # cache em memória da capa neutra

public/templates/m1/
├── sofa-capa-1/{image.png, mask.png, thumbnail.webp}
├── sofa-capa-2/...
├── sofa-capa-3/...
├── cadeira-capa-1/...
├── cadeira-capa-2/...
├── cadeira-capa-3/...
├── sofa-ambiente-1/...
├── sofa-ambiente-2/...
├── cadeira-ambiente-1/...
├── cadeira-ambiente-2/...
└── cadeira-ambiente-3/...

scripts/
└── generate-m1-masks.ts                 # utility — roda 1x por template
```

**Importante:** as 11 fotos-template em `public/templates/m1/{id}/image.png` serão fornecidas pelo Rafael **antes** da implementação começar. O Claude Code deve **pausar e pedir** se não encontrar os arquivos.

---

## 5. Tipos e Schema — `lib/m1/schema.ts`

```typescript
import { z } from 'zod'
import { M1_TEMPLATES } from './templates'

export const M1_MOVEIS = ['sofa', 'cadeira'] as const
export type M1Movel = (typeof M1_MOVEIS)[number]

export const M1_TIPOS_CAPA = ['estampada', 'lisa', 'alto-relevo'] as const
export type M1TipoCapa = (typeof M1_TIPOS_CAPA)[number]

export const M1_TIPOS_FOTO = ['capa', 'ambiente', 'elastico', 'detalhe-tecido'] as const
export type M1TipoFoto = (typeof M1_TIPOS_FOTO)[number]

// Tipos que usam Pipeline A (com cenário pré-aprovado)
export const M1_TIPOS_COM_CENARIO: readonly M1TipoFoto[] = ['capa', 'ambiente']

// Tipos que usam Pipeline B (foto bruta + cleanup)
export const M1_TIPOS_SEM_CENARIO: readonly M1TipoFoto[] = ['elastico', 'detalhe-tecido']

const TEMPLATE_IDS = M1_TEMPLATES.map(t => t.id) as [string, ...string[]]

export const M1RenderSchema = z.object({
  movel: z.enum(M1_MOVEIS),
  tipoCapa: z.enum(M1_TIPOS_CAPA),
  tipoFoto: z.enum(M1_TIPOS_FOTO),
  cenarioId: z.enum(TEMPLATE_IDS).optional(),
  referenciaBlobUrl: z.string().url(),
  customization: z.string().max(500).optional(),
}).superRefine((data, ctx) => {
  // Cenário obrigatório para Capa e Ambiente
  if (M1_TIPOS_COM_CENARIO.includes(data.tipoFoto) && !data.cenarioId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cenarioId'],
      message: 'Cenário obrigatório para Foto Capa e Foto Ambiente',
    })
  }
  // Cenário não permitido para Elástico e Detalhe Tecido
  if (M1_TIPOS_SEM_CENARIO.includes(data.tipoFoto) && data.cenarioId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cenarioId'],
      message: 'Foto Elástico e Detalhe do Tecido não usam cenário pré-aprovado',
    })
  }
  // Validação: cenário deve bater com o móvel
  if (data.cenarioId) {
    const template = M1_TEMPLATES.find(t => t.id === data.cenarioId)
    if (template && template.movel !== data.movel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cenarioId'],
        message: 'Cenário não corresponde ao tipo de móvel selecionado',
      })
    }
  }
})

export type M1RenderInput = z.infer<typeof M1RenderSchema>
```

---

## 6. Templates Default — `lib/m1/templates.ts`

```typescript
import type { M1Movel } from './schema'

export type M1TipoFotoComCenario = 'capa' | 'ambiente'

export type M1Template = {
  id: string
  movel: M1Movel
  tipoFoto: M1TipoFotoComCenario
  ordem: number
  nome: string
  descricao: string
  imagePath: string
  maskPath: string
  thumbnailPath: string
}

export const M1_TEMPLATES: M1Template[] = [
  // ─── Foto Capa · Sofá ───────────────────────
  {
    id: 'sofa-capa-1',
    movel: 'sofa', tipoFoto: 'capa', ordem: 1,
    nome: 'Sofá 1',
    descricao: 'Sala moderna minimalista — quadro geométrico, planta, prateleira',
    imagePath: '/templates/m1/sofa-capa-1/image.png',
    maskPath: '/templates/m1/sofa-capa-1/mask.png',
    thumbnailPath: '/templates/m1/sofa-capa-1/thumbnail.webp',
  },
  {
    id: 'sofa-capa-2',
    movel: 'sofa', tipoFoto: 'capa', ordem: 2,
    nome: 'Sofá 2',
    descricao: 'Sala boho contemporânea — quadro abstrato, abajur dourado',
    imagePath: '/templates/m1/sofa-capa-2/image.png',
    maskPath: '/templates/m1/sofa-capa-2/mask.png',
    thumbnailPath: '/templates/m1/sofa-capa-2/thumbnail.webp',
  },
  {
    id: 'sofa-capa-3',
    movel: 'sofa', tipoFoto: 'capa', ordem: 3,
    nome: 'Sofá 3',
    descricao: 'Sala clean orgânica — quadro Matisse, mesa redonda madeira',
    imagePath: '/templates/m1/sofa-capa-3/image.png',
    maskPath: '/templates/m1/sofa-capa-3/mask.png',
    thumbnailPath: '/templates/m1/sofa-capa-3/thumbnail.webp',
  },

  // ─── Foto Capa · Cadeira ─────────────────────
  {
    id: 'cadeira-capa-1',
    movel: 'cadeira', tipoFoto: 'capa', ordem: 1,
    nome: 'Cadeira 1',
    descricao: 'Sala de leitura — cortina bege, planta, banco dourado',
    imagePath: '/templates/m1/cadeira-capa-1/image.png',
    maskPath: '/templates/m1/cadeira-capa-1/mask.png',
    thumbnailPath: '/templates/m1/cadeira-capa-1/thumbnail.webp',
  },
  {
    id: 'cadeira-capa-2',
    movel: 'cadeira', tipoFoto: 'capa', ordem: 2,
    nome: 'Cadeira 2',
    descricao: 'Sala de jantar light — cortina branca, mesa lateral com flores',
    imagePath: '/templates/m1/cadeira-capa-2/image.png',
    maskPath: '/templates/m1/cadeira-capa-2/mask.png',
    thumbnailPath: '/templates/m1/cadeira-capa-2/thumbnail.webp',
  },
  {
    id: 'cadeira-capa-3',
    movel: 'cadeira', tipoFoto: 'capa', ordem: 3,
    nome: 'Cadeira 3',
    descricao: 'Sala estar clássica — sofá branco capitonê, lanterna, piso madeira',
    imagePath: '/templates/m1/cadeira-capa-3/image.png',
    maskPath: '/templates/m1/cadeira-capa-3/mask.png',
    thumbnailPath: '/templates/m1/cadeira-capa-3/thumbnail.webp',
  },

  // ─── Foto Ambiente · Sofá (2 templates) ─────
  {
    id: 'sofa-ambiente-1',
    movel: 'sofa', tipoFoto: 'ambiente', ordem: 1,
    nome: 'Sofá 1',
    descricao: '2 sofás (2+3 lugares) — sala contemporânea com espelho e planta',
    imagePath: '/templates/m1/sofa-ambiente-1/image.png',
    maskPath: '/templates/m1/sofa-ambiente-1/mask.png',
    thumbnailPath: '/templates/m1/sofa-ambiente-1/thumbnail.webp',
  },
  {
    id: 'sofa-ambiente-2',
    movel: 'sofa', tipoFoto: 'ambiente', ordem: 2,
    nome: 'Sofá 2',
    descricao: '2 sofás (2+3 lugares) — sala clean moderna com cortina padronizada',
    imagePath: '/templates/m1/sofa-ambiente-2/image.png',
    maskPath: '/templates/m1/sofa-ambiente-2/mask.png',
    thumbnailPath: '/templates/m1/sofa-ambiente-2/thumbnail.webp',
  },

  // ─── Foto Ambiente · Cadeira (3 templates) ──
  {
    id: 'cadeira-ambiente-1',
    movel: 'cadeira', tipoFoto: 'ambiente', ordem: 1,
    nome: 'Cadeira 1',
    descricao: 'Mesa com 6 cadeiras — sala elegante com abajur e cortina branca',
    imagePath: '/templates/m1/cadeira-ambiente-1/image.png',
    maskPath: '/templates/m1/cadeira-ambiente-1/mask.png',
    thumbnailPath: '/templates/m1/cadeira-ambiente-1/thumbnail.webp',
  },
  {
    id: 'cadeira-ambiente-2',
    movel: 'cadeira', tipoFoto: 'ambiente', ordem: 2,
    nome: 'Cadeira 2',
    descricao: 'Mesa com 6 cadeiras — sala sofisticada com painel decorativo',
    imagePath: '/templates/m1/cadeira-ambiente-2/image.png',
    maskPath: '/templates/m1/cadeira-ambiente-2/mask.png',
    thumbnailPath: '/templates/m1/cadeira-ambiente-2/thumbnail.webp',
  },
  {
    id: 'cadeira-ambiente-3',
    movel: 'cadeira', tipoFoto: 'ambiente', ordem: 3,
    nome: 'Cadeira 3',
    descricao: 'Mesa com 4 cadeiras — ambiente clean com piso laminado',
    imagePath: '/templates/m1/cadeira-ambiente-3/image.png',
    maskPath: '/templates/m1/cadeira-ambiente-3/mask.png',
    thumbnailPath: '/templates/m1/cadeira-ambiente-3/thumbnail.webp',
  },
]

export function getTemplatesPorMovelETipo(movel: M1Movel, tipoFoto: 'capa' | 'ambiente'): M1Template[] {
  return M1_TEMPLATES.filter(t => t.movel === movel && t.tipoFoto === tipoFoto)
}

export function getTemplateById(id: string): M1Template | undefined {
  return M1_TEMPLATES.find(t => t.id === id)
}
```

---

## 7. Prompts — `lib/m1/prompts.ts`

Todos os prompts em **inglês** (Flux Kontext performa melhor) com **comentários PT-BR** no topo de cada bloco.

```typescript
import type { M1Movel, M1TipoCapa, M1TipoFoto } from './schema'

// ═══════════════════════════════════════════════════════════════
// PIPELINE A — Step 1: Capa Neutra Intermediária
// Comentário PT: extrai a estampa/cor/relevo da foto-referência
// e gera um "swatch" limpo do tecido com aquela estampa.
// Esse swatch fica cacheado e é reutilizado nos vários cenários.
// ═══════════════════════════════════════════════════════════════

const STEP1_BASE = `
INSTRUCTION:
Extract the textile pattern, color and texture from the reference image.
Generate a clean, flat fabric swatch showing ONLY this pattern/color, 
isolated against a neutral light gray background.

OUTPUT REQUIREMENTS:
- Flat fabric swatch, no furniture, no environment
- Centered composition, swatch fills 80% of the frame
- Even, soft studio lighting from above
- Neutral light gray background (#E5E5E5)
- The swatch must show the fabric texture clearly

FABRIC SPECIFICATION:
The fabric is polyester elastane stretch jersey knit — flat matte finish.
Render with visible fabric weave texture.
`

const STEP1_PROMPTS: Record<M1TipoCapa, string> = {
  estampada: `${STEP1_BASE}

PATTERN INSTRUCTIONS:
- Reproduce the printed pattern from the reference EXACTLY
- Preserve all colors, pattern scale, density and details
- The pattern is printed flat on the fabric surface (2D print, not embossed)
- For complex patterns (boho, geometric, intricate motifs), preserve every detail

AVOID:
- Color shift or saturation change
- Pattern simplification or stylization
- Velvet, velour, plush, satin or glossy appearance
- 3D effects or embossing (this is a printed pattern, flat)
`,

  lisa: `${STEP1_BASE}

COLOR INSTRUCTIONS:
- Reproduce the EXACT solid color from the reference
- Uniform color across the entire swatch
- Match hue, saturation and brightness precisely

AVOID:
- Color shift or saturation change
- ANY printed pattern or texture variation
- Velvet, velour, plush, satin or glossy appearance
- Sheen, gloss or reflective fabric look
- Any fabric type other than matte jersey knit
`,

  'alto-relevo': `${STEP1_BASE}

EMBOSSED PATTERN INSTRUCTIONS:
- The fabric has an EMBOSSED/QUILTED pattern (3D relief stitched into the fabric)
- The base fabric has a SOLID uniform color
- The pattern is created by quilted stitching that creates raised relief
- Reproduce the EXACT relief pattern from the reference (medallions, florals, mandalas, etc.)
- Preserve the depth and dimensionality of the embossing
- The relief MUST be visible — show shadows in the stitched grooves

AVOID:
- Printed pattern (this is embossed, not printed)
- Flat appearance (must show 3D depth)
- Color variation in the pattern (color is uniform; the design is purely textural)
- Velvet, velour, plush or satin
`,
}

export function buildStep1Prompt(tipoCapa: M1TipoCapa): string {
  return STEP1_PROMPTS[tipoCapa]
}


// ═══════════════════════════════════════════════════════════════
// PIPELINE A — Step 2: Aplicar Capa Neutra no Cenário
// Comentário PT: aplica o swatch (do Step 1) no móvel da foto-template,
// preservando 100% do ambiente, ângulo e iluminação. Usa mask 
// pré-gerada para garantir que só o móvel é alterado.
// ═══════════════════════════════════════════════════════════════

type Step2Params = {
  movel: M1Movel
  tipoCapa: M1TipoCapa
  tipoFoto: 'capa' | 'ambiente'
  customization?: string
}

export function buildStep2Prompt(p: Step2Params): string {
  const object = p.movel === 'sofa' ? 'sofa' : 'dining chair'
  const objectPlural = p.movel === 'sofa' 
    ? (p.tipoFoto === 'ambiente' ? 'sofas (one 2-seater + one 3-seater)' : 'sofa') 
    : (p.tipoFoto === 'ambiente' ? 'dining chairs (6 chairs around the table)' : 'dining chair')

  const baseBlock = `
# === FOTO ${p.tipoFoto.toUpperCase()} · ${p.movel.toUpperCase()} · ${p.tipoCapa.toUpperCase()} ===
# Comentário PT: aplica capa no ${p.movel} mantendo cenário 100% intacto

INSTRUCTION:
Apply the fabric pattern/color from the reference swatch (provided as 
secondary reference) to the cover of the ${objectPlural} in the scene.
Preserve every other element of the original scene completely unchanged.

PRESERVE STRICTLY (do not alter):
- Environment: walls, floor, decoration, surrounding furniture, plants
- Camera angle and perspective
- Lighting, shadows and color temperature
- Geometry, shape and pose of the ${object}
- All objects, plants and accessories in the scene

REPLACE ONLY:
- The visible cover fabric on the ${objectPlural}
- Match the reference swatch EXACTLY — same colors, same pattern, no variation
`

  const fabricBlock = p.tipoCapa === 'alto-relevo' ? `
FABRIC SPECIFICATION (mandatory):
The cover is a polyester elastane stretch fabric with EMBOSSED/QUILTED texture.
The pattern is created by quilted stitching that creates raised 3D relief 
(NOT printed). Render with:
- Visible depth and shadows in the quilted stitching
- Uniform base color matching the reference
- The relief pattern is preserved even where the fabric stretches over edges
- Subtle, barely visible cover seam lines along the edges
- Fabric tucking naturally into gaps between cushions, armrests and base
- Natural draping that follows the ${object} shape

AVOID AT ALL COSTS:
- Flat envelope-like surface
- Painted-on appearance  
- Printed pattern (this is embossed, not printed)
- Color variation in the relief pattern
- Velvet, velour, plush or satin appearance
- Any change to the environment, lighting or camera angle
` : `
FABRIC SPECIFICATION (mandatory realism):
The cover is a polyester elastane stretch jersey knit fabric — flat matte finish.
Render with:
- Subtle, barely visible seam lines along the cover edges (almost imperceptible)
- Fabric tucking naturally into gaps between cushions, armrests and base
- Small wrinkles and folds where the cover meets the furniture geometry
- Visible fabric texture — never a flat or painted appearance
- Natural draping that follows the underlying furniture shape

AVOID AT ALL COSTS:
- Flat envelope-like surface
- Painted-on appearance
- Cartoon or 3D-render aesthetic
- Color or pattern variation from the reference
- Any change to the environment, lighting or camera angle
- Velvet, velour, plush or satin appearance
- Sheen, gloss or reflective fabric look
- Any fabric type other than matte jersey knit
`

  const ambienteBlock = p.tipoFoto === 'ambiente' ? `
MULTI-FURNITURE COHERENCE (critical):
- Scene contains multiple matching pieces
- Apply the SAME pattern/color/relief CONSISTENTLY on ALL pieces
- Maintain coherent pattern SCALE across all pieces, even at different angles
- All pieces must look like matching items from the same collection
- The pattern/color must be EXACTLY the same on every piece — no variation 
  in hue, saturation, pattern density or scale
` : ''

  const customBlock = p.customization ? `
USER CUSTOMIZATION (apply within constraints):
${p.customization}
` : ''

  return `${baseBlock}${fabricBlock}${ambienteBlock}${customBlock}

OUTPUT: photorealistic, magazine-quality product photo, sharp focus, 
natural lighting consistent with the original scene.`
}


// ═══════════════════════════════════════════════════════════════
// PIPELINE B — Foto Elástico (cleanup)
// Comentário PT: transforma foto bruta de celular (mão esticando 
// a capa) em foto profissional. Mantém a ação real, melhora 
// iluminação/fundo/foco.
// ═══════════════════════════════════════════════════════════════

export function buildElasticoPrompt(movel: M1Movel, customization?: string): string {
  const object = movel === 'sofa' ? 'sofa' : 'dining chair'
  
  return `
# === FOTO ELÁSTICO · ${movel.toUpperCase()} ===
# Comentário PT: limpa a foto bruta de celular esticando a capa
# Mantém a ação real, melhora luz, fundo e foco

INSTRUCTION:
Transform this raw smartphone photo of a hand stretching the cover fabric 
on a ${object} into a professional product photograph.

PRESERVE (do not alter):
- The exact moment of the hand stretching the fabric
- The fabric pattern, color and texture
- The visible elasticity demonstration
- The fabric's relationship to the ${object} underneath
- Hand position and gesture (clean up imperfections subtly)

ENHANCE:
- Improve lighting: balanced, soft, natural-looking studio quality
- Blur or simplify the background (keep neutral, non-distracting)
- Improve sharpness on the fabric texture and stretching action
- Ensure colors are accurate, not oversaturated
- Crop intelligently to focus on the stretching action

AESTHETIC:
- Natural lighting feel, not heavy color grading
- Professional product photography style
- Magazine quality but understated
- E-commerce premium aesthetic

AVOID:
- Heavy filters or oversaturation
- Artificial / plastic appearance
- Changing the fabric texture or pattern
- Adding elements that weren't in the original photo
- Removing the hand or changing the gesture
- Background that competes with the fabric
${customization ? `\nUSER CUSTOMIZATION:\n${customization}` : ''}

OUTPUT: photorealistic, professional close-up photograph showcasing 
fabric elasticity, 1080×1080.`
}


// ═══════════════════════════════════════════════════════════════
// PIPELINE B — Foto Detalhe do Tecido (cleanup)
// Comentário PT: limpa foto bruta mostrando costuras + verso da capa 
// + assento original. Comunica qualidade + facilidade de vestir.
// ═══════════════════════════════════════════════════════════════

export function buildDetalheTecidoPrompt(movel: M1Movel, customization?: string): string {
  const object = movel === 'sofa' ? 'sofa' : 'dining chair'
  
  return `
# === FOTO DETALHE DO TECIDO · ${movel.toUpperCase()} ===
# Comentário PT: limpa foto bruta mostrando costuras, verso da capa,
# assento original embaixo. Comunica qualidade do produto e facilidade
# de vestir (efeito "antes e depois").

INSTRUCTION:
Transform this raw smartphone photo of hands lifting/pulling back the 
cover on a ${object} into a professional detail photograph.

PRESERVE (do not alter):
- The exact gesture of hands lifting the cover
- The visible cover stitching and elastic seam on the underside
- The original ${object} upholstery underneath (this contrast is essential 
  to communicate "before/after" — the original seat vs the new cover)
- The fabric pattern, color and texture
- The way the cover stretches and fits

ENHANCE:
- Improve lighting: soft, natural, even illumination
- Blur or simplify the background (remove visual distractions)
- Improve sharpness on stitching details and fabric texture
- Make the seams and elastic edge clearly visible (this is the focus)
- Crop intelligently to frame the gesture and the contrast between 
  cover and original upholstery

AESTHETIC:
- Natural lighting, not heavy color grading
- Professional close-up product photography
- Communicates "quality cover" + "easy to install"
- E-commerce premium aesthetic, but natural-looking

AVOID:
- Heavy filters, oversaturation or color shifts
- Artificial / plastic appearance
- Hiding the original ${object} upholstery (it must remain visible)
- Removing or repositioning the hands
- Changing the fabric or stitching details
- Background that competes with the detail focus
${customization ? `\nUSER CUSTOMIZATION:\n${customization}` : ''}

OUTPUT: photorealistic, professional close-up showing fabric quality, 
stitching detail and before/after contrast, 1080×1080.`
}
```

---

## 8. Cache de Capa Neutra — `lib/m1/cache.ts`

```typescript
import { LRUCache } from 'lru-cache'
import crypto from 'crypto'
import type { M1TipoCapa } from './schema'

type CacheKey = string
type CachedSwatch = {
  swatchBuffer: Buffer
  createdAt: number
}

// Cache em memória — válido durante o lifetime da função serverless.
// Em Vercel, isso significa cache por instância "warm". Aceitável para 
// uso real (equipe gera múltiplos cenários em sequência).
const capaNeutraCache = new LRUCache<CacheKey, CachedSwatch>({
  max: 50,
  ttl: 30 * 60 * 1000, // 30 min
})

export function buildCacheKey(referenciaBlobUrl: string, tipoCapa: M1TipoCapa): CacheKey {
  // Hash da URL + tipoCapa garante cache key único e estável
  return crypto.createHash('sha256')
    .update(`${referenciaBlobUrl}|${tipoCapa}`)
    .digest('hex')
    .slice(0, 16)
}

export function getCachedSwatch(key: CacheKey): Buffer | null {
  const cached = capaNeutraCache.get(key)
  return cached?.swatchBuffer ?? null
}

export function setCachedSwatch(key: CacheKey, swatchBuffer: Buffer): void {
  capaNeutraCache.set(key, { swatchBuffer, createdAt: Date.now() })
}

export function getCacheStats(): { size: number; max: number } {
  return { size: capaNeutraCache.size, max: capaNeutraCache.max }
}
```

---

## 9. Cliente fal.ai — `lib/m1/fal-client.ts`

**SDK:** `@fal-ai/client@1.10+` (oficial 1.0+, substitui o deprecated `@fal-ai/serverless-client`).
**Três funções, três endpoints:**

| Função | Endpoint | Quando usar |
|---|---|---|
| `callFluxKontext` | `fal-ai/flux-pro/kontext` | Step 1 (capa neutra) · Pipeline B (Elástico + Detalhe Tecido) |
| `callFluxKontextInpaint` | `fal-ai/flux-kontext-lora/inpaint` | Step 2 do Pipeline A (aplicar swatch no template via mask) |
| `callGroundedSam` | `fal-ai/grounded-sam-2` | Script `m1:generate-masks` (offline, 1x por template) |

Padrão geral:
- `import { fal } from '@fal-ai/client'` (singleton, compatível com APIs pré-1.0)
- `fal.config({ credentials: process.env.FAL_KEY })` no module load
- `fal.subscribe(endpointId, { input, logs: false })` retorna `{ data, requestId }`
- Tipos locais sem `any` — espelho dos shapes oficiais (alguns endpoints não estão no `EndpointTypeMap` do SDK; tipamos localmente o que consumimos)
- Upload de Buffer via `fal.storage.upload(new Blob([new Uint8Array(buf)], { type: 'image/png' }))`

```typescript
import { fal } from '@fal-ai/client'
import { brandM1 } from '@/lib/brand/m1.brand'

fal.config({ credentials: process.env.FAL_KEY })

// Step 1 (capa neutra) + Pipeline B (Elástico + Detalhe Tecido)
type FluxKontextInput = {
  image_url: string
  prompt: string
  guidance_scale?: number
  output_format?: 'png' | 'jpeg'
}

// Step 2 do Pipeline A — mirror de BaseKontextInpaintInput
type FluxKontextInpaintInput = {
  image_url: string
  mask_url: string
  reference_image_url: string
  prompt: string
  guidance_scale?: number
  num_inference_steps?: number
  output_format?: 'png' | 'jpeg'
  strength?: number
}

export async function callFluxKontext(args: {
  imageBuffer?: Buffer
  imageUrl?: string
  prompt: string
}): Promise<Buffer> { /* image_url + prompt; sem mask, sem reference */ }

export async function callFluxKontextInpaint(args: {
  imageBuffer: Buffer
  maskBuffer: Buffer
  referenceBuffer: Buffer
  prompt: string
  numInferenceSteps?: number
  strength?: number
}): Promise<Buffer> { /* image + mask + reference + prompt */ }

export async function callGroundedSam(args: {
  imageBuffer: Buffer
  textPrompt: string
}): Promise<Buffer> { /* offline-only */ }
```

**Importante:**
- O endpoint `fal-ai/flux-kontext-lora/inpaint` **não está mapeado** no `EndpointTypeMap` do SDK 1.10 (mas o shape `BaseKontextInpaintInput` está exportado em `endpoints.d.ts` — espelho local de tipo cobre isso).
- Validar comportamento real no primeiro render. Se o endpoint inpaint não atender qualidade, alternativa em DEC-006 (Opção B): re-arquitetar Pipeline A sem mask.
- `TODO(fal-api)` removido — divergência resolvida ao escolher endpoint correto.

---

## 10. Pipeline A (Capa + Ambiente) — `lib/m1/render-pipeline-a.ts`

**Mudança v1.0 → v1.1:** Step 1 segue em `fal-ai/flux-pro/kontext` (apenas `image_url + prompt`). **Step 2 agora usa `fal-ai/flux-kontext-lora/inpaint`**, que aceita `image_url + mask_url + reference_image_url + prompt` no tipo oficial.

```typescript
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { put } from '@vercel/blob'
import { nanoid } from 'nanoid'
import { brandM1 } from '@/lib/brand/m1.brand'
import type { M1RenderInput } from './schema'
import { getTemplateById } from './templates'
import { buildStep1Prompt, buildStep2Prompt } from './prompts'
import { callFluxKontext, callFluxKontextInpaint } from './fal-client'
import { buildCacheKey, getCachedSwatch, setCachedSwatch } from './cache'

export async function renderPipelineA(input: M1RenderInput): Promise<string> {
  if (!input.cenarioId) throw new Error('cenarioId obrigatório para Pipeline A')
  const template = getTemplateById(input.cenarioId)
  if (!template) throw new Error(`Template não encontrado: ${input.cenarioId}`)

  const [templateBuffer, maskBuffer] = await Promise.all([
    readFile(path.join(process.cwd(), 'public', template.imagePath)),
    readFile(path.join(process.cwd(), 'public', template.maskPath)),
  ])

  const referenciaResp = await fetch(input.referenciaBlobUrl)
  if (!referenciaResp.ok) throw new Error('Falha ao baixar referência da capa')
  const referenciaBuffer = Buffer.from(await referenciaResp.arrayBuffer())

  // STEP 1 — capa neutra/swatch (com cache; endpoint flux-pro/kontext)
  const cacheKey = buildCacheKey(input.referenciaBlobUrl, input.tipoCapa)
  let swatchBuffer = getCachedSwatch(cacheKey)
  if (!swatchBuffer) {
    swatchBuffer = await callFluxKontext({
      imageBuffer: referenciaBuffer,
      prompt: buildStep1Prompt(input.tipoCapa),
    })
    setCachedSwatch(cacheKey, swatchBuffer)
  }

  // STEP 2 — aplicar swatch no template via inpainting
  // Endpoint: fal-ai/flux-kontext-lora/inpaint (resolve DEC-006)
  const finalBuffer = await callFluxKontextInpaint({
    imageBuffer: templateBuffer,
    maskBuffer,
    referenceBuffer: swatchBuffer,
    prompt: buildStep2Prompt({
      movel: input.movel,
      tipoCapa: input.tipoCapa,
      tipoFoto: input.tipoFoto as 'capa' | 'ambiente',
      customization: input.customization,
    }),
  })

  const { width, height } = brandM1.dimensions.fotoCapa
  const webpBuffer = await sharp(finalBuffer)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .webp({ quality: 90 })
    .toBuffer()

  const blob = await put(`m1/${nanoid()}.webp`, webpBuffer, {
    access: 'public',
    contentType: 'image/webp',
  })
  return blob.url
}
```

---

## 11. Pipeline B (Elástico + Detalhe Tecido) — `lib/m1/render-pipeline-b.ts`

```typescript
import sharp from 'sharp'
import { put } from '@vercel/blob'
import { nanoid } from 'nanoid'
import type { M1RenderInput } from './schema'
import { buildElasticoPrompt, buildDetalheTecidoPrompt } from './prompts'
import { callFluxKontext } from './fal-client'

export async function renderPipelineB(input: M1RenderInput): Promise<string> {
  // 1. Baixar foto bruta enviada pelo usuário
  const fotoResp = await fetch(input.referenciaBlobUrl)
  if (!fotoResp.ok) throw new Error('Falha ao baixar foto enviada')
  const fotoBuffer = Buffer.from(await fotoResp.arrayBuffer())

  // 2. Escolher prompt conforme tipo de foto
  const prompt = input.tipoFoto === 'elastico'
    ? buildElasticoPrompt(input.movel, input.customization)
    : buildDetalheTecidoPrompt(input.movel, input.customization)

  // 3. Chamar Flux Kontext em modo de cleanup
  const enhancedBuffer = await callFluxKontext({
    imageBuffer: fotoBuffer,
    prompt: prompt,
  })

  // 4. Sharp → WEBP 1080×1080
  const webpBuffer = await sharp(enhancedBuffer)
    .resize(1080, 1080, { fit: 'cover', position: 'center' })
    .webp({ quality: 90 })
    .toBuffer()

  // 5. Upload Vercel Blob
  const blob = await put(`m1/${nanoid()}.webp`, webpBuffer, {
    access: 'public',
    contentType: 'image/webp',
  })

  return blob.url
}
```

---

## 12. Orquestrador — `lib/m1/render.ts`

```typescript
import type { M1RenderInput } from './schema'
import { M1_TIPOS_COM_CENARIO } from './schema'
import { renderPipelineA } from './render-pipeline-a'
import { renderPipelineB } from './render-pipeline-b'

export async function renderM1(input: M1RenderInput): Promise<string> {
  const usaPipelineA = M1_TIPOS_COM_CENARIO.includes(input.tipoFoto)
  return usaPipelineA ? renderPipelineA(input) : renderPipelineB(input)
}
```

---

## 13. Script de Geração de Masks — `scripts/generate-m1-masks.ts`

```typescript
/**
 * Gera as masks de segmentação para os 11 templates do M1 (Foto Capa e 
 * Foto Ambiente). Roda 1x antes do M1 entrar em produção, e novamente 
 * sempre que um template for adicionado ou substituído.
 *
 * Uso: pnpm tsx scripts/generate-m1-masks.ts
 */

import { M1_TEMPLATES } from '@/lib/m1/templates'
import { callGroundedSam } from '@/lib/m1/fal-client'
import { readFile, writeFile, access } from 'fs/promises'
import path from 'path'

async function generateMaskForTemplate(template: typeof M1_TEMPLATES[number]) {
  const imagePath = path.join(process.cwd(), 'public', template.imagePath)
  const maskPath = path.join(process.cwd(), 'public', template.maskPath)

  // Skip se já existe
  try {
    await access(maskPath)
    console.log(`✓ ${template.id} — mask já existe, pulando`)
    return
  } catch {}

  console.log(`→ Gerando mask para ${template.id}...`)

  const imageBuffer = await readFile(imagePath)
  const textPrompt = template.movel === 'sofa' ? 'sofa' : 'dining chair'

  const maskBuffer = await callGroundedSam({ imageBuffer, textPrompt })

  await writeFile(maskPath, maskBuffer)
  console.log(`✓ ${template.id} — mask salva em ${template.maskPath}`)
}

async function main() {
  console.log(`Gerando masks para ${M1_TEMPLATES.length} templates...\n`)
  for (const template of M1_TEMPLATES) {
    await generateMaskForTemplate(template)
  }
  console.log('\nTodas as masks geradas com sucesso.')
}

main().catch(err => {
  console.error('Erro:', err)
  process.exit(1)
})
```

Adicionar ao `package.json`:
```json
{
  "scripts": {
    "m1:generate-masks": "tsx scripts/generate-m1-masks.ts"
  }
}
```

---

## 14. API Route — `app/api/imagens/m1/render/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { M1RenderSchema } from '@/lib/m1/schema'
import { renderM1 } from '@/lib/m1/render'

export const maxDuration = 60 // Vercel Pro obrigatório (pipeline 2-step ~16s)
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = M1RenderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Input inválido', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const startedAt = Date.now()
    const url = await renderM1(parsed.data)
    const tookMs = Date.now() - startedAt
    console.log(`[M1] Render OK em ${tookMs}ms — ${parsed.data.tipoFoto}/${parsed.data.tipoCapa}`)
    return NextResponse.json({ url, tookMs })
  } catch (err) {
    console.error('[M1] render error:', err)
    return NextResponse.json(
      { error: 'Falha ao gerar foto', message: (err as Error).message },
      { status: 500 }
    )
  }
}
```

---

## 15. UI — Tela `/imagens/m1-vitrine`

Estrutura conforme mockups aprovados:

### 15.1 `app/imagens/m1-vitrine/page.tsx`

```tsx
import { AppShell } from '@/components/layout/app-shell'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { M1Form } from './_components/m1-form'

export default function M1Page() {
  return (
    <AppShell>
      <div style={{ padding: '36px 40px 40px', maxWidth: 920 }}>
        <Breadcrumb items={[
          { label: 'Geração de Imagens' },
          { label: 'M1 · Foto Produto Vitrine' },
        ]} />

        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 500, letterSpacing: '-0.025em' }}>
          Foto Produto Vitrine
        </h1>
        <p style={{ margin: '0 0 28px', fontSize: 13.5, color: 'var(--text-secondary)', maxWidth: 460 }}>
          Gere fotos profissionais aplicando a nova estampa em cenários pré-aprovados.
        </p>

        <M1Form />
      </div>
    </AppShell>
  )
}
```

### 15.2 Estrutura dos componentes em `_components/`

**`m1-form.tsx`** (Client Component, orquestrador):
- Estado: `movel`, `tipoCapa`, `tipoFoto`, `cenarioId`, `referenciaBlobUrl`, `customization`
- Renderiza os steps na ordem:
  1. Tab Sofá / Cadeira (`tab-tipo-movel.tsx`)
  2. Step 01 — Tipo de capa (`step-tipo-capa.tsx`) — 3 opções (Estampada, Lisa, Alto Relevo)
  3. Step 02 — Tipo de foto (`step-tipo-foto.tsx`) — 4 opções (Capa, Ambiente, Elástico, Detalhe do Tecido)
  4. Step 03 — Cenário (`step-cenario.tsx`) — **só visível** se tipo for Capa ou Ambiente
  5. Step 04 — Upload de referência (`step-upload-referencia.tsx`) — label muda conforme tipo de foto
  6. Step 05 — Customização opcional (`step-customizacao.tsx`)
  7. Botão Gerar (`generate-button.tsx`)
  8. Preview area (`preview-area.tsx`)

**Comportamento dinâmico:**
- Trocar `tabMovel` zera `cenarioId` (cenários são por móvel)
- Trocar `tipoFoto` entre tipo-com-cenário ↔ sem-cenário esconde/mostra Step 03 com fade
- Trocar `tipoFoto` zera `cenarioId` e o `referenciaBlobUrl` (porque o significado do upload muda)
- Step 03 mostra apenas templates filtrados por `movel + tipoFoto`
- Botão "Gerar" disabled se: faltar qualquer campo obrigatório

**Validação em tempo real:** usar `react-hook-form` + `zodResolver(M1RenderSchema)`.

### 15.3 Cards do Step 03 (Cenário)

Pra Foto Capa: 3 cards do tipo de móvel selecionado.
Pra Foto Ambiente: 2 cards (sofá) ou 3 cards (cadeira).

Layout: linha horizontal, cards ~80px de largura (igual M4), com:
- Thumbnail (do `thumbnailPath`)
- Nome (ex: "Sofá 1")
- Descrição curta (1 linha cinza)

Card selecionado: borda 1.5px roxa `#553679`.

### 15.4 Step 04 — Label dinâmico

| `tipoFoto` | Label do upload | Texto auxiliar |
|---|---|---|
| `capa` ou `ambiente` | "Foto de referência da capa" | "Foto pronta da capa, usada apenas para ajuste e padronização." |
| `elastico` | "Foto bruta da ação esticando" | "Foto de celular mostrando a mão esticando a capa no móvel." |
| `detalhe-tecido` | "Foto bruta puxando a capa" | "Foto de celular mostrando a mão levantando a capa, com o assento original aparecendo." |

---

## 16. Tooltips Finais — Conteúdo Exato

| Campo | Texto do tooltip |
|---|---|
| **Tab Sofá** | (sem tooltip) |
| **Tab Cadeira** | (sem tooltip) |
| **Tipo de capa — Estampada** | *"Capa com padrão impresso 2D (estampas geométricas, florais, etc.). A IA replica o padrão EXATAMENTE como na foto enviada."* |
| **Tipo de capa — Lisa** | *"Capa em cor uniforme, sem padrão. A IA aplica a cor exata da foto enviada, mantendo a textura de malha poliéster."* |
| **Tipo de capa — Alto Relevo** | *"Capa com padrão 3D bordado/quiltado no tecido (não impresso). A IA preserva o relevo e a cor uniforme da foto enviada."* |
| **Tipo de foto — Foto Capa** | *"Foto principal do produto: móvel com capa aplicada no cenário pré-aprovado."* |
| **Tipo de foto — Foto Ambiente** | *"Foto ampla do ambiente com 2 sofás ou mesa com 6 cadeiras, todas com a mesma capa."* |
| **Tipo de foto — Foto Elástico** | *"Close da mão esticando a capa vestida no móvel. Demonstra elasticidade do tecido."* |
| **Tipo de foto — Detalhe do Tecido** | *"Detalhe das costuras + verso da capa + assento original embaixo. Comunica qualidade do produto e facilidade de vestir."* |
| **Cenário** | *"Escolha o cenário pré-aprovado onde a capa será aplicada. O ambiente, o ângulo e a iluminação são mantidos. A IA substitui apenas a estampa/cor do móvel pela sua referência."* |
| **Foto de referência da capa** | *"Foto pronta da capa, usada apenas para ajuste e padronização da estampa/cor. PNG ou JPEG, até 10MB. Quanto melhor a qualidade da foto, mais fiel o resultado."* |
| **Foto bruta da ação esticando** | *"Foto de celular mostrando uma mão esticando a capa vestida no móvel. A IA limpa a foto, melhora a iluminação e o fundo. Não recria a cena."* |
| **Foto bruta puxando a capa** | *"Foto de celular mostrando a mão levantando a capa, com o assento original do móvel aparecendo. A IA limpa a foto e foca no detalhe da costura. Mantém o assento visível para comunicar antes/depois."* |
| **Customização** | *"Ajustes visuais livres. Ex: 'mais luz natural', 'menos saturação'. A IA aplica dentro do padrão do template — sem alterar a estampa nem o cenário."* |
| **Botão Gerar foto** | *"Gera a foto WEBP 1080×1080 pronta para upload no Shopify. Processo leva entre 8 e 18 segundos."* |

---

## 17. Cron de Limpeza do Blob — Já Cobre M1

O cron existente em `app/api/cron/cleanup-blob/route.ts` já remove blobs `m1/*` com mais de 7 dias automaticamente. Sem ação adicional necessária — a regra de preservar `templates/*` mantém os assets fixos do M1 intactos.

---

## 18. STUBs e TODOs Explícitos

Marcar com `// TODO(M1):` os seguintes pontos:

1. **Endpoints fal.ai** (`fal-client.ts`):
   - ✅ DEC-006 resolvida: três endpoints distintos (`flux-pro/kontext`, `flux-kontext-lora/inpaint`, `grounded-sam-2`).
   - Validar **qualidade real** do `flux-kontext-lora/inpaint` no primeiro render — endpoint usa modelo `dev`+LoRA. Se qualidade insuficiente, recorrer à Opção B da DEC-006 (re-arquitetar Pipeline A sem mask).
   - O shape `BaseKontextInpaintInput` está exportado no `endpoints.d.ts` do SDK mas o endpoint string `fal-ai/flux-kontext-lora/inpaint` não está no `EndpointTypeMap`. Tipamos localmente.

2. **Refinamento de prompts** (`prompts.ts`):
   - Prompts iniciais conforme spec — refinamento fino na **fase de treinamento manual** (Rafael testa outputs e ajusta texto)
   - Adicionar `// TODO(treinamento): refinar após primeiros testes`

3. **Estampas complexas** (registrar em `DIVIDAS_PROJETO.md` como DEC-004):
   - Boho, Egito, mandalas e padrões muito densos podem precisar 2-step adicional
   - Avaliar na fase de treinamento; ativar 3-step só se 2-step falhar

4. **Foto Sofá 2** (template `sofa-capa-2`):
   - Aguardando substituição do Rafael (versão sem overlay circular)
   - Se o arquivo `public/templates/m1/sofa-capa-2/image.png` não estiver presente, **pausar e pedir**

5. **Cache cross-instance** (futuro):
   - Cache em memória funciona por instância serverless
   - Em uso real (equipe pequena), ok
   - Se houver problema, considerar Redis (Upstash) — registrar em `DIVIDAS_PROJETO.md` como `[REF-002]`

---

## 19. Como Rodar

```bash
# 1. Garantir que dependências do M1 estão instaladas
pnpm install

# 2. Configurar FAL_KEY
# - Adicionar no Vercel Dashboard (Production + Preview)
# - Adicionar localmente: vercel env pull

# 3. Garantir que assets dos templates existem em public/templates/m1/
# - Rafael fornece as 11 fotos PNG antes de implementar
# - Se faltarem, pausar e pedir

# 4. Gerar masks pré-computadas (1x antes do primeiro deploy)
pnpm m1:generate-masks

# 5. Commit dos masks + thumbnails gerados
git add public/templates/m1/
git commit -m "feat(m1): adicionar masks e thumbnails dos 11 templates"

# 6. Deploy
git push origin main
```

---

## 20. Checklist Final de Implementação

### Funcional
- [ ] Acessar `/imagens/m1-vitrine` requer login
- [ ] Tab Sofá / Cadeira alterna conjunto de cenários
- [ ] Step 01 mostra 3 opções de capa (Estampada, Lisa, Alto Relevo)
- [ ] Step 02 mostra 4 opções de foto (Capa, Ambiente, Elástico, Detalhe do Tecido)
- [ ] Step 03 só aparece para Capa e Ambiente
- [ ] Step 03 mostra cenários filtrados por móvel + tipo de foto
- [ ] Step 04 label muda conforme tipo de foto selecionado
- [ ] Upload via Vercel Blob (PNG/JPEG, até 10MB)
- [ ] Customização opcional aceita até 500 chars
- [ ] Botão "Gerar" disabled enquanto inválido
- [ ] Ao gerar: chama `/api/imagens/m1/render`, mostra loading, exibe resultado WEBP
- [ ] Botão "Fazer Download" no preview funciona

### Pipeline
- [ ] Pipeline A (Capa + Ambiente) usa 2-step com cache
- [ ] Pipeline B (Elástico + Detalhe Tecido) usa 1-step cleanup
- [ ] Capa neutra é cacheada por 30 min (LRU)
- [ ] Output sempre WEBP 1080×1080
- [ ] Tempo total < 60s (Vercel Pro)

### Técnico
- [ ] `pnpm typecheck` sem erros
- [ ] `pnpm lint` sem warnings
- [ ] `pnpm build` completa
- [ ] Schema Zod valida combinações (cenário obrigatório se Capa/Ambiente, proibido se Elástico/Detalhe)
- [ ] Brand config m1 é fonte única (sem hardcode)
- [ ] Masks geradas para todos os 11 templates (commit no repo)

### Validação visual (manual com Rafael)
- [ ] Gerar Foto Capa Sofá 1 com 1 estampa simples — validar fidelidade
- [ ] Gerar Foto Capa Sofá 1 com 1 estampa complexa (Boho) — validar
- [ ] Gerar Foto Capa Cadeira 1 — validar
- [ ] Gerar Foto Ambiente Sofá com 2 sofás — validar coerência de estampa
- [ ] Gerar Foto Elástico — validar cleanup vs original
- [ ] Gerar Foto Detalhe do Tecido — validar antes/depois visível
- [ ] Testar cache: gerar mesma capa em 3 cenários consecutivos — Step 1 só executa 1x

---

## 21. Após Implementação

Quando terminar:
1. Atualizar `SESSION_HANDOFF.md` com Sessão "Implementação M1" e marcos atingidos
2. Registrar bugs/dúvidas em `DIVIDAS_PROJETO.md`
3. Avisar Rafael pra fase de **treinamento manual dos prompts**:
   - Rafael testa 5–10 combinações diferentes
   - Para cada output ruim, refina o prompt correspondente
   - Itera até qualidade satisfatória (estampas simples primeiro, complexas depois)
4. Apagar `IMPL_M1.md` após confirmação de Rafael

---

## 22. Em Caso de Dúvida

- Decisões de produto travadas: registrar em `DIVIDAS_PROJETO.md` seção "Decisões Pendentes" e pausar
- Decisões técnicas menores: documentar inline com `// NOTE:` e seguir
- Bugs ou comportamentos estranhos: registrar em `DIVIDAS_PROJETO.md` seção "Bugs"
- **Nunca inventar contexto de produto.** Em dúvida, perguntar.
