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
  // V1.1.1 (BUG-M2-010): LLM pode hintar comparison quando detecta
  // antes/depois no roteiro. Planner usa esse hint pra rotear pro
  // subtemplate comparison-before-after.
  subtemplateHint: z.enum(['comparison-before-after']).nullable().default(null),
  imagePromptBefore: z.string().max(600).nullable().default(null),
  imagePromptAfter: z.string().max(600).nullable().default(null),
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

═══════════════════════════════════════════════════════════
REGRA #0 — PRESERVAÇÃO LITERAL ABSOLUTA (PRIMÁRIA, IRRENUNCIÁVEL)
═══════════════════════════════════════════════════════════
Esta regra tem PRIORIDADE sobre TODAS as outras. Se outra regra deste prompt sugerir algo que contradiga preservação literal, IGNORE a outra regra e siga esta.

- title, subtitle, bullets, cta = TEXTO LITERAL do input do usuário, palavra por palavra.
- NUNCA reescreva. NUNCA reformule. NUNCA resuma. NUNCA expanda.
- NUNCA traduza (exceto imagePrompt/imagePromptBefore/imagePromptAfter, que SÃO em inglês).
- NUNCA invente: preços ("R$10", "promoção", "frete grátis"), quantidades, datas, nomes de produtos, marcas, ofertas, CTAs promocionais, ou qualquer texto que não esteja no input.
- NUNCA mude caixa-alta/baixa de forma agressiva (preserve a capitalização natural; o sistema decide upper/lower depois).
- Se o input diz "Os erros que sabotam o calor da sua cama", o output title É "Os erros que sabotam o calor da sua cama" — não "ERROS 1 E 2 QUE ESFRIAM A NOITE".
- Validação interna: antes de retornar, releia o input bruto e compare palavra por palavra com o JSON. Cada palavra-chave do input deve aparecer no output correspondente. Se algo novo apareceu, REMOVA.

EXEMPLO CONCRETO (estude antes de responder):
INPUT (bruto):
"""
Texto: Os erros que sabotam o calor da sua cama
Apoio: Tudo que você arruma errado sem perceber
"""
✅ OUTPUT CORRETO:
{"title":"Os erros que sabotam o calor da sua cama","subtitle":"Tudo que você arruma errado sem perceber",...}
❌ OUTPUT PROIBIDO (você inventou):
{"title":"ERROS 1 E 2 QUE ESFRIAM A NOITE","subtitle":"Descobrimos o que muita gente erra",...}
❌ OUTPUT PROIBIDO (você reescreveu):
{"title":"5 erros que esfriam sua cama","subtitle":"O que você faz de errado",...}

═══════════════════════════════════════════════════════════
REGRA #0.1 — CTA LITERAL (sub-cláusula da #0)
═══════════════════════════════════════════════════════════
- Se o input tem "CTA: <texto>", então output.cta = "<texto>" EXATAMENTE, sem alteração.
- NÃO traduza, NÃO encurte, NÃO expanda, NÃO modifique pontuação, NÃO transforme caso.
- NUNCA invente CTA promocional (ex: "CONHEÇA NA LOJA", "COMPRE AGORA") se o user não escreveu.
- Se input não tem linha "CTA:", output.cta = null.
EXEMPLO:
INPUT: "CTA: Compartilhe com uma amiga friorenta"
✅ output.cta = "Compartilhe com uma amiga friorenta"
❌ output.cta = "COMPARTILHE COM UMA AMIGA"  (você modificou caixa)
❌ output.cta = "CONHEÇA NA LOJA"  (você inventou)

═══════════════════════════════════════════════════════════
REGRA #0.2 — NÚMERO DE SLIDES É IMUTÁVEL (sub-cláusula da #0)
═══════════════════════════════════════════════════════════
- O sistema processa 1 slide por vez. Você recebe 1 roteiro → você devolve 1 JSON para ESSE slide.
- NUNCA divida o roteiro em vários slides. NUNCA junte conteúdo de outros slides.
- Se um slide tem pouco conteúdo, retorne bullets=[] ou subtitle=null. Mas é UM slide, sempre.
- slideIndex e totalSlides no userPrompt são metadados — não tente "ajudar" alterando estrutura.

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
- subtemplateHint: "comparison-before-after" | null. Sinalize SOMENTE se detectar comparison (regra abaixo). Default null.
- imagePromptBefore: string | null. PRESENTE APENAS se subtemplateHint="comparison-before-after". EM INGLÊS. Descrição do estado "antes/ruim/errado/velho".
- imagePromptAfter: string | null. PRESENTE APENAS se subtemplateHint="comparison-before-after". EM INGLÊS. Descrição do estado "depois/bom/certo/novo".

REGRA — DETECTAR COMPARISON (BUG-M2-010 V1.1.1)
Se o roteiro do slide menciona qualquer um destes pares:
- "antes/depois", "errado/certo", "ruim/bom", "com/sem"
- OU tem 2 descrições de imagem ("Descrição da imagem antes" + "Descrição da imagem depois", ou "Imagem 1/2", etc)
- OU descreve duas versões/estados do mesmo objeto

ENTÃO retorne:
- subtemplateHint = "comparison-before-after"
- imagePromptBefore = primeira descrição (antes/errado/ruim/velho) traduzida pra inglês
- imagePromptAfter = segunda descrição (depois/certo/bom/novo) traduzida pra inglês
- imagePrompt = null (não usar — comparison usa os dois prompts dedicados)

EXEMPLO comparison:
INPUT:
"""
Texto: Cobertor pesado vs leve em camadas
Apoio: a diferença real
Descrição da imagem antes: heavy single thick blanket on bed
Descrição da imagem depois: bed with three light layered blankets stacked
"""
OUTPUT:
{"title":"Cobertor pesado vs leve em camadas","subtitle":"a diferença real","bullets":[],"imagePrompt":null,"cta":null,"subtemplateHint":"comparison-before-after","imagePromptBefore":"heavy single thick blanket spread on bed, dense fabric, dark color","imagePromptAfter":"bed with three light layered blankets stacked, soft fabric, bright tones"}

REGRA — cta_final SEMPRE TEM IMAGEM (BUG-M2-009 V1.1.1)
- cta_final agora SEMPRE preenche imagePrompt (carrossel viral requer imagem em 100% dos slides).
- Se o roteiro não descreveu imagem explicitamente pro cta_final, INFIRA a imagem a partir do contexto/tema do carrossel.
- imagePrompt deve descrever PRODUTO/OBJETO em inglês, conciso (até ~30 palavras), conforme as REGRAS DO imagePrompt abaixo.

REGRAS DO imagePrompt (CRÍTICAS — Pipeline Híbrido invariante DEC-M2-014)
- Descreva APENAS o produto/objeto/sujeito principal e suas características intrínsecas (tipo, cor, formato, material, condição).
- NUNCA mencione cenário ou background. PROIBIDO: "background", "scene", "environment", "marble", "counter", "table", "surface", "kitchen counter", "kitchen", "room", "wall", "floor", "natural lighting", "ambient", "interior".
- O fundo é responsabilidade do compose Sharp (não do gpt-image-1). Se o input do user mencionar cenário ("sobre bancada de mármore", "na cozinha"), IGNORE o cenário e descreva só o produto.
- Sempre EM INGLÊS, conciso (até ~30 palavras).
- Exemplo bom: "yellow rectangular kitchen sponge with green scrubber on top, common Brazilian dish sponge, flat proportions, used and dirty condition"
- Exemplo ruim: "yellow sponge on white marble counter with natural light" (menciona cenário — proibido)
- Exemplo ruim: "three cleaning products arranged on countertop" (menciona surface — proibido)

REGRAS POR TIPO DE SLIDE
- cover: título forte + subtitle opcional. bullets vazio. imagePrompt OBRIGATÓRIO em V1.1.1 (carrossel viral requer imagem em 100% dos slides — se o roteiro não descreveu, INFIRA do tema).
- content: título curto + bullets (3-6 itens). imagePrompt OBRIGATÓRIO em V1.1.1 (mesmo motivo).
- cta_final: title é a frase de fechamento, subtitle complementa, cta é a ação. imagePrompt OBRIGATÓRIO em V1.1.1 (BUG-M2-009 — se o roteiro não descreveu, INFIRA do tema).
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

async function callLLM(userPrompt: string, systemOverride?: string): Promise<string> {
  const llmCall = fal.subscribe('fal-ai/any-llm', {
    input: {
      prompt: userPrompt,
      system_prompt: systemOverride ?? SYSTEM_PROMPT,
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

// ─── V1.1.2 — Validação anti-invenção pós-LLM ───────────────────────────────

const META_LABELS_REGEX_GLOBAL = /^(?:texto|apoio|descri[cç][aã]o da imagem(?:\s*(?:antes|depois|before|after|1|2))?|cta|imagem|t[ií]tulo|subt[ií]tulo|bullet)\s*[:\-]\s*/gim

/** Normaliza pra comparação: lowercase + sem acentos + sem pontuação. */
function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Tokenização de palavras significativas (>2 chars, sem stopwords PT-BR comuns). */
const STOPWORDS_PT = new Set([
  'que','de','do','da','dos','das','para','por','com','sem','em','no','na','nos','nas',
  'um','uma','uns','umas','o','a','os','as','e','ou','se','sua','seu','suas','seus',
  'voce','voces','é','sao','foi','vai','ja','tem','ser','estar','muito','mais','mesmo',
  'pra','pro','isso','esse','essa','este','esta','tudo','todo','toda','todos','todas',
])
function significantTokens(s: string): string[] {
  return normalizeForCompare(s)
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS_PT.has(t))
}

export interface AntiInventionViolation {
  field: 'title' | 'subtitle' | 'cta' | 'bullets'
  reason: string
}

/**
 * Compara output do LLM contra input bruto. Detecta inventos (palavras novas
 * em title/subtitle/cta que não aparecem no input) e truncamento severo.
 *
 * Política V1.1.2:
 * - title: ≥70% das palavras significativas do output devem aparecer no input.
 * - subtitle: ≥70% das palavras significativas devem aparecer no input.
 * - cta: deve ser substring case-insensitive do input (literal).
 */
export function validateAntiInvention(
  inputCopyTexto: string,
  output: ParsedSlide,
): AntiInventionViolation[] {
  const inputClean = inputCopyTexto.replace(META_LABELS_REGEX_GLOBAL, ' ')
  const inputTokens = new Set(significantTokens(inputClean))
  const violations: AntiInventionViolation[] = []

  function checkField(field: 'title' | 'subtitle', value: string | null) {
    if (!value) return
    const outTokens = significantTokens(value)
    if (outTokens.length === 0) return
    const overlap = outTokens.filter((t) => inputTokens.has(t)).length
    const ratio = overlap / outTokens.length
    if (ratio < 0.7) {
      violations.push({
        field,
        reason: `${field}: ${Math.round(ratio * 100)}% das palavras vieram do input (esperado ≥70%). Output: "${value.slice(0, 80)}"`,
      })
    }
  }

  checkField('title', output.title)
  checkField('subtitle', output.subtitle)

  // CTA: validação mais estrita — deve ser substring literal do input bruto.
  if (output.cta) {
    const ctaNormOut = normalizeForCompare(output.cta)
    const ctaNormIn = normalizeForCompare(inputCopyTexto)
    if (!ctaNormIn.includes(ctaNormOut)) {
      violations.push({
        field: 'cta',
        reason: `cta inventado: "${output.cta}" não aparece literal no input`,
      })
    }
  }

  return violations
}

const ENFORCE_PROMPT_SUFFIX = `

═══════════════════════════════════════════════════════════
ATENÇÃO — VOCÊ JÁ ERROU UMA VEZ NESTE ROTEIRO.
═══════════════════════════════════════════════════════════
Sua tentativa anterior INVENTOU texto que não estava no input. Esta é a 2ª e ÚLTIMA tentativa.

Releia o input PALAVRA POR PALAVRA. Cada palavra de title, subtitle, bullets, cta DEVE existir no roteiro do usuário. NÃO REESCREVA. NÃO REFORMULE. NÃO INVENTE.

Se o usuário escreveu "Os erros que sabotam o calor", você devolve EXATAMENTE "Os erros que sabotam o calor" — não "5 erros que esfriam a noite" nem "Erros 1 e 2".`

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
    // 1ª tentativa: prompt normal.
    let rawOutput = await callLLM(userPrompt)
    let jsonStr = extractJson(rawOutput)
    let validated = parsedSlideSchema.parse(JSON.parse(jsonStr) as unknown)
    // V1.1.2 (FIX A1): validação anti-invenção. Se falhar, retry 1× com
    // prompt enforçado. Se 2ª também falhar, FAIL pra fallback regex.
    let violations = validateAntiInvention(opts.slideCopy, validated)
    if (violations.length > 0) {
      console.warn(
        `[T2/parser] anti-invention violations slide ${opts.slideIndex + 1}/${opts.totalSlides} (tentativa 1): ${violations.map((v) => v.reason).join(' | ')}`,
      )
      rawOutput = await callLLM(userPrompt, SYSTEM_PROMPT + ENFORCE_PROMPT_SUFFIX)
      jsonStr = extractJson(rawOutput)
      validated = parsedSlideSchema.parse(JSON.parse(jsonStr) as unknown)
      violations = validateAntiInvention(opts.slideCopy, validated)
      if (violations.length > 0) {
        const reason = `LLM inventou texto em ambas as tentativas: ${violations.map((v) => v.reason).join(' | ')}`
        console.error(`[T2/parser] FAIL anti-invention slide ${opts.slideIndex + 1}/${opts.totalSlides}: ${reason}`)
        throw new Error(reason)
      }
      console.log(
        `[T2/parser] retry-2 OK slide ${opts.slideIndex + 1}/${opts.totalSlides} (anti-invention)`,
      )
    }

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
      // V1.1.1: fallback regex não detecta comparison nem before/after.
      subtemplateHint: null,
      imagePromptBefore: null,
      imagePromptAfter: null,
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
    subtemplateHint: null,
    imagePromptBefore: null,
    imagePromptAfter: null,
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
