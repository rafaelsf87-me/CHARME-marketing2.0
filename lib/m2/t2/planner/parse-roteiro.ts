/**
 * T2 Planner — LLM-based roteiro parser (Fase 6, BUG-M2-003)
 *
 * Extrai estrutura semântica (title/subtitle/bullets/imagePrompt/cta) de
 * roteiro PT-BR livre do usuário. Endpoint: fal-ai/any-llm via Claude Haiku
 * 4.5. Fallback regex sempre disponível — geração nunca bloqueia por falha
 * do LLM.
 *
 * NOTE: fal-ai/any-llm marked deprecated by fal.ai (19/05/2026) but endpoint
 * remains functional. Migration path on failure:
 *   1. openrouter/router (also via FAL_KEY, not deprecated)
 *   2. @anthropic-ai/sdk direct (requires ANTHROPIC_API_KEY)
 * See [REF-M2-007] in DIVIDAS_PROJETO.md.
 */

import { fal } from '@fal-ai/client'
import { z } from 'zod'

fal.config({ credentials: process.env.FAL_KEY })

const MODEL = 'anthropic/claude-haiku-4.5'
const LLM_TIMEOUT_MS = 10_000

// ─── Output schema (validado por Zod) ──────────────────────────────────────

export const parsedSlideSchema = z.object({
  title: z.string().max(200).default(''),
  subtitle: z.string().max(280).nullable().default(null),
  bullets: z.array(z.string().max(200)).max(8).default([]),
  imagePrompt: z.string().max(600).nullable().default(null),
  // CTA frequentemente vem long-form em PT-BR ("Curtiu? Compartilhe com
  // uma amiga que ama X"). 60 chars era estreito demais e causava fallback
  // desnecessário. Bumped pra 220 (cobre frases naturais); o auto-shrink
  // do text-renderer encaixa visualmente.
  cta: z.string().max(220).nullable().default(null),
})

export type ParsedSlide = z.infer<typeof parsedSlideSchema>

export type ParsedSlideSlideType = 'cover' | 'content' | 'cta_final' | 'imagem_unica'

export interface ParseRoteiroOpts {
  slideCopy: string
  slideType: ParsedSlideSlideType
  slideIndex: number
  totalSlides: number
}

export interface ParseRoteiroResult {
  parsed: ParsedSlide
  via: 'llm' | 'fallback'
  rawLlmOutput?: string
  errorReason?: string
  durationMs: number
}

// ─── System prompt (estrutura + regras + exemplos) ─────────────────────────

const SYSTEM_PROMPT = `Você é um assistente que extrai estrutura semântica de roteiros de slide de Instagram em PT-BR para um sistema de geração automática de imagens.

REGRA ABSOLUTA — INVENÇÃO PROIBIDA
- Preserve LITERALMENTE valores, preços, números, nomes, marcas e produtos mencionados no roteiro do usuário.
- NUNCA invente: preços ("R$10", "promoção", "frete grátis"), quantidades, datas, nomes de produtos, marcas, ofertas, ou qualquer informação que não esteja explícita no input bruto.
- Se o usuário não mencionou, NÃO existe na sua resposta.
- Validação interna: antes de retornar, confira que qualquer valor numérico ou preço presente no JSON também aparece no input bruto. Se aparecer algo novo, REMOVA.

REGRAS DE EXTRAÇÃO
1. IGNORE labels meta no input do usuário: "Texto", "Apoio", "Descrição da imagem", "CTA", "Imagem", "Título", "Subtítulo", "Bullet", "•", "-" (no início de linha).
2. FOQUE no conteúdo real do roteiro — extraia o que o usuário QUER comunicar, não as etiquetas estruturais.
3. TRADUZA descrições visuais pra INGLÊS no campo imagePrompt (gpt-image-1 performa melhor em inglês).
4. Retorne JSON estrito sem markdown, sem fences \`\`\`, sem explicação.

CAMPOS DE SAÍDA
- title: string. Frase principal do slide. Max 200 chars. SEMPRE preenchido.
- subtitle: string | null. Apoio do título, 1 frase curta, max 280 chars. Null se o slide só tem título.
- bullets: array de strings. Itens objetivos (max 8, max 200 chars cada). [] se não houver lista.
- imagePrompt: string | null. Descrição EM INGLÊS do PRODUTO/OBJETO isolado, pra IA gerar. Null se o slide é só texto.
- cta: string | null. Call-to-action, max 60 chars. Só preencha se slideType="cta_final" E o roteiro pede CTA explicitamente; caso contrário null.

REGRAS DO imagePrompt (CRÍTICAS — Pipeline Híbrido invariante DEC-M2-014)
- Descreva APENAS o produto/objeto/sujeito principal e suas características intrínsecas (tipo, cor, formato, material, condição).
- NUNCA mencione cenário ou background. PROIBIDO: "background", "scene", "environment", "marble", "counter", "table", "surface", "kitchen counter", "kitchen", "room", "wall", "floor", "natural lighting", "ambient", "interior".
- O fundo é responsabilidade do compose Sharp (não do gpt-image-1). Se o input do user mencionar cenário ("sobre bancada de mármore", "na cozinha"), IGNORE o cenário e descreva só o produto.
- Sempre EM INGLÊS, conciso (até ~30 palavras).
- Exemplo bom: "yellow rectangular kitchen sponge with green scrubber on top, common Brazilian dish sponge, flat proportions, used and dirty condition"
- Exemplo ruim: "yellow sponge on white marble counter with natural light" (menciona cenário — proibido)
- Exemplo ruim: "three cleaning products arranged on countertop" (menciona surface — proibido)

REGRAS POR TIPO DE SLIDE
- cover: título forte + subtitle opcional. bullets vazio. imagePrompt ENCORAJADO se houver "Descrição da imagem".
- content: título curto + bullets (3-6 itens). imagePrompt ENCORAJADO se houver "Descrição da imagem".
- cta_final: title é a frase de fechamento, subtitle complementa, cta é a ação. imagePrompt NULL por default; só preencha se o roteiro pede imagem decorativa explícita.
- imagem_unica: similar a cta_final.

REGRA — SEPARAÇÃO TITLE/SUBTITLE EM CONTEÚDO NUMERADO
- Se o texto começa com padrão "N. Nome do item." (numeração + nome curto + ponto) seguido de descrição:
  - title = "N. Nome do item" (CURTO — max 40 chars, foco na numeração + nome)
  - subtitle = descrição completa (todo o texto após o primeiro ponto)
- Exemplo: input "3. Escorredor de louça. Ele vive molhado e pode acumular limo, resíduos e manchas sem você perceber."
  → title: "3. Escorredor de louça"
  → subtitle: "Ele vive molhado e pode acumular limo, resíduos e manchas sem você perceber."
- Outro exemplo: input "1. Botões do fogão. Eles acumulam gordura, poeira e resíduos das mãos o tempo todo."
  → title: "1. Botões do fogão"
  → subtitle: "Eles acumulam gordura, poeira e resíduos das mãos o tempo todo."
- Se o texto NÃO tem numeração inicial, title é a primeira frase curta natural (até o primeiro ponto ou interrogação) e subtitle é o resto.
- NUNCA deixe title com mais de 40 chars quando houver opção de quebrar pelo ponto.

EXEMPLO (cover):
INPUT:
"""
Texto: Você sabia que a capa elástica veste qualquer sofá?
Apoio: Sim, qualquer um — testamos com 200 modelos diferentes.
Descrição da imagem: sofá branco com capa elástica esticada por cima, sala clara
"""
OUTPUT:
{"title":"Você sabia que a capa elástica veste qualquer sofá?","subtitle":"Sim, qualquer um — testamos com 200 modelos diferentes.","bullets":[],"imagePrompt":"a white modern sofa with a fitted stretch cover applied, clean studio-style product shot of the sofa only","cta":null}

EXEMPLO (content):
INPUT:
"""
Texto: 3 itens da cozinha que você troca por R$10
Bullet: Bucha amarela com esfregão verde
Bullet: Esponja de aço fina
Bullet: Pano de microfibra
Descrição da imagem: três itens de limpeza dispostos sobre bancada de mármore branco
"""
OUTPUT:
{"title":"3 itens da cozinha que você troca por R$10","subtitle":null,"bullets":["Bucha amarela com esfregão verde","Esponja de aço fina","Pano de microfibra"],"imagePrompt":"three Brazilian kitchen cleaning items grouped together: a yellow rectangular sponge with a green scrubber on top, a thin steel wool pad, and a folded microfiber cloth","cta":null}

EXEMPLO (cta_final):
INPUT:
"""
Texto: Aproveite essa promoção agora.
CTA: COMPRAR AGORA
"""
OUTPUT:
{"title":"Aproveite essa promoção agora.","subtitle":null,"bullets":[],"imagePrompt":null,"cta":"COMPRAR AGORA"}`

// ─── FAL adapter ───────────────────────────────────────────────────────────

interface FalAnyLLMOutput {
  output: string
  reasoning?: string
  partial?: boolean
  error?: string
}

/** Extrai bloco JSON do output do LLM (lida com fences markdown + texto extra). */
function extractJson(text: string): string {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  const firstBrace = stripped.indexOf('{')
  const lastBrace = stripped.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return stripped.slice(firstBrace, lastBrace + 1)
  }
  return stripped
}

async function callLLM(userPrompt: string): Promise<string> {
  const llmCall = fal.subscribe('fal-ai/any-llm', {
    input: {
      prompt: userPrompt,
      system_prompt: SYSTEM_PROMPT,
      model: MODEL,
      temperature: 0.2,
      max_tokens: 1024,
    },
  })
  const result = await Promise.race([
    llmCall,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('LLM timeout 10s')), LLM_TIMEOUT_MS),
    ),
  ])
  const data = (result as { data: FalAnyLLMOutput }).data
  if (data.error) throw new Error(`LLM error: ${data.error}`)
  if (!data.output) throw new Error('LLM returned empty output')
  return data.output
}

// ─── parseRoteiroSlide (entry point) ──────────────────────────────────────

export async function parseRoteiroSlide(opts: ParseRoteiroOpts): Promise<ParseRoteiroResult> {
  const startedAt = Date.now()
  const userPrompt = `slideType: ${opts.slideType}
slideIndex: ${opts.slideIndex + 1} de ${opts.totalSlides}

ROTEIRO DO USUÁRIO:
"""
${opts.slideCopy}
"""

Retorne o JSON estrito conforme o schema definido no system prompt.`

  try {
    const rawOutput = await callLLM(userPrompt)
    const jsonStr = extractJson(rawOutput)
    const parsedJson = JSON.parse(jsonStr) as unknown
    const validated = parsedSlideSchema.parse(parsedJson)
    return {
      parsed: validated,
      via: 'llm',
      rawLlmOutput: rawOutput,
      durationMs: Date.now() - startedAt,
    }
  } catch (err) {
    const errorReason = err instanceof Error ? err.message : String(err)
    console.warn(
      `[T2/parser] LLM falhou slide ${opts.slideIndex + 1}/${opts.totalSlides} (${opts.slideType}), usando fallback regex. Erro: ${errorReason}`,
    )
    return {
      parsed: parseFallback(opts),
      via: 'fallback',
      errorReason,
      durationMs: Date.now() - startedAt,
    }
  }
}

// ─── Fallback regex (heurística determinística, sem rede) ──────────────────
//
// Aplicado quando: LLM timeout, erro de rede, JSON inválido, schema Zod falha.
// Replica o comportamento original do Planner (parseCoverText/parseBullets)
// + tira labels meta tipo "Texto:", "Apoio:", "Descrição da imagem:".

const META_LABEL_REGEX = /^(?:texto|apoio|descri[cç][aã]o da imagem|cta|imagem|t[ií]tulo|subt[ií]tulo|bullet)\s*[:\-]\s*/i

function stripMetaLabel(line: string): string {
  return line.replace(META_LABEL_REGEX, '').trim()
}

export function parseFallback(opts: ParseRoteiroOpts): ParsedSlide {
  const allLines = opts.slideCopy
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)

  // Separa linhas em "conteúdo" (sem label) e "labels removidos"
  const cleaned: string[] = []
  let imagePromptFromLabel: string | null = null
  let ctaFromLabel: string | null = null
  for (const raw of allLines) {
    const isImageLabel = /^descri[cç][aã]o da imagem\s*[:\-]/i.test(raw)
    const isCtaLabel = /^cta\s*[:\-]/i.test(raw)
    const stripped = stripMetaLabel(raw)
    if (isImageLabel) {
      imagePromptFromLabel = stripped || null
      continue
    }
    if (isCtaLabel) {
      ctaFromLabel = stripped || null
      continue
    }
    if (stripped) cleaned.push(stripped)
  }

  if (
    opts.slideType === 'cover' ||
    opts.slideType === 'cta_final' ||
    opts.slideType === 'imagem_unica'
  ) {
    const title = cleaned[0] ?? opts.slideCopy.slice(0, 200)
    const subtitle = cleaned.slice(1).join(' ') || null
    const cta = opts.slideType === 'cta_final' ? ctaFromLabel : null
    return {
      title,
      subtitle: subtitle && subtitle !== title ? subtitle : null,
      bullets: [],
      // Fallback NÃO traduz pra inglês — preserva PT-BR cru. Melhor que nada.
      imagePrompt: imagePromptFromLabel,
      cta,
    }
  }

  // content
  const firstLooksLikeTitle = cleaned[0] !== undefined && cleaned[0].length < 80
  const title = firstLooksLikeTitle ? cleaned[0] : ''
  const rawBullets = firstLooksLikeTitle ? cleaned.slice(1) : cleaned
  const bullets = rawBullets
    .map((b) => b.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 8)
  return {
    title,
    subtitle: null,
    bullets,
    imagePrompt: imagePromptFromLabel,
    cta: null,
  }
}

// ─── Helper pra chamar em paralelo (Promise.all no Planner) ────────────────

export async function parseRoteiroBatch(
  slides: Array<Omit<ParseRoteiroOpts, 'totalSlides'>>,
): Promise<ParseRoteiroResult[]> {
  const total = slides.length
  return Promise.all(
    slides.map((s) => parseRoteiroSlide({ ...s, totalSlides: total })),
  )
}
