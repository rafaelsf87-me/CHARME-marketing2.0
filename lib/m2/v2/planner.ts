/**
 * V2 Planner — input.brief → V2Plan
 *
 * Pipeline:
 *  1. LLM (Claude Haiku 4.5 via fal-ai/any-llm) extrai estrutura semântica:
 *     título, bullets+ícones, badge, cardInferior, ctaButtonTexto, heroPrompt
 *  2. Code (não LLM) decide variant CURTA vs LONGA por char count + override
 *  3. Validação Zod do V2Plan
 *
 * Invariantes herdadas (NÃO REABRIR):
 *  - REGRA #0: LLM preserva texto literal do brief (não inventa, não traduz PT)
 *  - REGRA #0.1: CTA literal (CTA-FINAL texto fixo é exceção controlada)
 *  - REGRA #0.2: 1 brief = 1 plan (sem divisão)
 *  - DEC-M2-014: upload bypassa LLM+gpt-image-1 do HERO. LLM ainda processa textos.
 *
 * Fallback: se LLM falhar/timeout, regex extractor garante mínimo viável
 * (título = primeira linha, bullets = linhas com '•'/'-', hero = null).
 */

import { fal } from '@fal-ai/client'
import { z } from 'zod'
import { v2PlanSchema, type V2PlanParsed } from './schema'
import { iconsSemanticBlockForLLM } from './icons'
import { totalCharCount } from './text-buckets'
import type {
  V2CapaVariant,
  V2IconId,
  V2Input,
  V2Plan,
  V2VariantOverride,
} from './types'

fal.config({ credentials: process.env.FAL_KEY })

const MODEL = 'anthropic/claude-haiku-4.5'
const LLM_TIMEOUT_MS = 12_000

// ─── Output do LLM (pré-decisão de variant) ─────────────────────────────────

const llmOutputSchema = z.object({
  titulo: z.string().min(1).max(200),
  bullets: z
    .array(z.object({ texto: z.string().min(1).max(200), icone: z.string() }))
    .max(4)
    .default([]),
  badgeSubtema: z
    .object({ texto: z.string().min(1).max(60), icone: z.string() })
    .nullable()
    .default(null),
  iconeTopo: z.string().nullable().default(null),
  cardInferior: z
    .object({
      numero: z.string().max(3).nullable().default(null),
      titulo: z.string().min(1).max(120),
      bullets: z.array(z.string().max(120)).max(3).default([]),
    })
    .nullable()
    .default(null),
  cardInferiorLonga: z
    .object({
      textoLongo: z.string().min(1).max(220),
      destaque: z.string().min(1).max(80),
      icone: z.string(),
    })
    .nullable()
    .default(null),
  heroPrompt: z.string().max(600).nullable().default(null),
})

type LlmOutput = z.infer<typeof llmOutputSchema>

// ─── System prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você extrai estrutura semântica de briefings de posts Instagram em PT-BR pra um sistema de geração automática de imagens (Charme do Detalhe — e-commerce de têxteis para casa).

═══════════════════════════════════════════════════════════
REGRA #0 — PRESERVAÇÃO LITERAL ABSOLUTA (IRRENUNCIÁVEL)
═══════════════════════════════════════════════════════════
- titulo, bullets[].texto, badgeSubtema.texto, cardInferior.titulo, cardInferior.bullets[], cardInferiorLonga.textoLongo, cardInferiorLonga.destaque = TEXTO LITERAL do briefing, palavra por palavra.
- NUNCA reescreva, reformule, resuma ou expanda.
- NUNCA invente preços, ofertas, marcas, CTAs promocionais, dados que não estão no briefing.
- NUNCA traduza (exceto heroPrompt, que SEMPRE é em inglês).
- Se o brief diz "Como renovar a sala gastando pouco", titulo = "COMO RENOVAR A SALA" e badge = "GASTANDO POUCO" (caixa-alta visual será aplicada pelo render — preserve a capitalização natural).

═══════════════════════════════════════════════════════════
ÍCONES DISPONÍVEIS (escolha por semântica do texto do bullet)
═══════════════════════════════════════════════════════════
${iconsSemanticBlockForLLM()}

REGRA: para cada bullet, escolha o icone cujo significado mais bate com a ideia principal do texto. Se nenhum bate, use "sparkle" (fallback).

═══════════════════════════════════════════════════════════
CAMPOS DE SAÍDA (JSON estrito, sem markdown)
═══════════════════════════════════════════════════════════

- titulo: string. Frase principal do post. SEMPRE preenchida. Max 200 chars.

- bullets: array de objetos { texto, icone }. Max 4. Cada bullet é um ponto curto extraído do brief.
  Se o brief não tem bullets explícitos (texto corrido), retorne []. NÃO invente bullets.
  texto: max 200 chars, literal. icone: id do ícone da lista acima.

- badgeSubtema: { texto, icone } OU null. Use APENAS quando o título tem 2 partes claras (ex: "COMO RENOVAR A SALA / GASTANDO POUCO"). texto = subparte do título destacada (max 60 chars). icone = pílula contextual (ex: "cifrao" pra "GASTANDO POUCO").

- iconeTopo: id do ícone OU null. Use APENAS para briefings emocionais/reflexivos (não-transacionais, ex: "cansaço invisível", "cuidado com a casa"). Sugestão: "casa-coracao" pra temas brand-emocional, "coracao" pra afeto.

- cardInferior: { numero, titulo, bullets } OU null. Use quando o brief tem uma "conclusão" ou "destaque numerado". numero: "1", "2"... ou null. titulo: frase do destaque. bullets: 0-3 sub-pontos curtos.

- cardInferiorLonga: { textoLongo, destaque, icone } OU null. Use APENAS quando o brief tem fechamento emocional em 2 partes: texto reflexivo + chamada curta destaque (ex: "Cuidar da casa é trabalho que não se vê / VOCÊ TAMBÉM MERECE SER CUIDADO!").

- heroPrompt: string em INGLÊS OU null. Descrição visual do hero (produto/cena) pra gpt-image-1.
  Estilo padrão V2: realistic photograph, soft lighting, isolated subject, purple gradient background blue to violet, Instagram aesthetic, high quality.
  NULL se o brief não menciona elemento visual ou se modo upload (sistema avisa).

REGRA DE EXCLUSIVIDADE
- Use APENAS UM entre cardInferior e cardInferiorLonga (não os dois ao mesmo tempo).
- Use APENAS UM entre badgeSubtema e iconeTopo (não os dois).
- Heurística: brief curto/transacional → cardInferior + badgeSubtema (CAPA-CURTA).
            brief longo/emocional → cardInferiorLonga + iconeTopo (CAPA-LONGA).

EXEMPLO 1 (transacional, curto):
INPUT: """
COMO RENOVAR A SALA gastando pouco
• PROTEGE contra sujeira, manchas e desgastes
• TRANSFORMA o visual da sua sala de forma rápida e econômica
• CABE NO BOLSO pequeno investimento, grande renovação
• PRÁTICA E FUNCIONAL fácil de colocar, tirar e lavar
Destaque: 1. Capa de sofá... muda tudo
  - Esconde manchas... renova na hora
  - e parece sofá novo
  - Sem reforma... sem dor de cabeça
"""
OUTPUT:
{
  "titulo": "COMO RENOVAR A SALA",
  "badgeSubtema": { "texto": "GASTANDO POUCO", "icone": "cifrao" },
  "iconeTopo": null,
  "bullets": [
    { "texto": "PROTEGE contra sujeira, manchas e desgastes", "icone": "escudo" },
    { "texto": "TRANSFORMA o visual da sua sala de forma rápida e econômica", "icone": "sparkle" },
    { "texto": "CABE NO BOLSO pequeno investimento, grande renovação", "icone": "cifrao" },
    { "texto": "PRÁTICA E FUNCIONAL fácil de colocar, tirar e lavar", "icone": "check" }
  ],
  "cardInferior": {
    "numero": "1",
    "titulo": "Capa de sofá... muda tudo",
    "bullets": ["Esconde manchas... renova na hora", "e parece sofá novo", "Sem reforma... sem dor de cabeça"]
  },
  "cardInferiorLonga": null,
  "heroPrompt": "modern gray sofa with stretchable patterned cover, realistic photograph, soft natural lighting, isolated on purple gradient background blue to violet, Instagram aesthetic, side view, high quality"
}

EXEMPLO 2 (emocional, longo):
INPUT: """
O cansaço invisível de quem cuida da casa
• Não é só a bagunça que cansa
• O esforço de manter tudo funcionando também pesa.
Fechamento: Cuidar da casa é um trabalho que muitas vezes não se vê, mas que faz toda a diferença todos os dias. / VOCÊ TAMBÉM MERECE SER CUIDADO!
"""
OUTPUT:
{
  "titulo": "O CANSAÇO INVISÍVEL DE QUEM CUIDA DA CASA",
  "badgeSubtema": null,
  "iconeTopo": "casa-coracao",
  "bullets": [
    { "texto": "Não é só a bagunça que cansa", "icone": "x-circulo" },
    { "texto": "O esforço de manter tudo funcionando também pesa.", "icone": "lampada" }
  ],
  "cardInferior": null,
  "cardInferiorLonga": {
    "textoLongo": "Cuidar da casa é um trabalho que muitas vezes não se vê, mas que faz toda a diferença todos os dias.",
    "destaque": "VOCÊ TAMBÉM MERECE SER CUIDADO!",
    "icone": "coracao"
  },
  "heroPrompt": "tired woman in apron leaning on laundry basket, kitchen background, realistic photograph, soft natural lighting, purple gradient background blue to violet, Instagram aesthetic, high quality"
}

Retorne APENAS o JSON. Sem markdown. Sem fences. Sem explicação.`

// ─── Chamada LLM ────────────────────────────────────────────────────────────

async function callLlm(brief: string): Promise<{ raw: string; parsed: LlmOutput }> {
  type LlmResponse = { output?: string }
  const subscribePromise = fal.subscribe('fal-ai/any-llm', {
    input: {
      model: MODEL,
      system_prompt: SYSTEM_PROMPT,
      prompt: brief,
    },
    logs: false,
  })
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('LLM timeout')), LLM_TIMEOUT_MS),
  )
  const { data } = (await Promise.race([subscribePromise, timeoutPromise])) as {
    data: LlmResponse
  }
  const raw = (data?.output ?? '').trim()
  if (!raw) throw new Error('LLM retornou output vazio')

  // Limpa markdown fences caso LLM ignore instrução.
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  let json: unknown
  try {
    json = JSON.parse(cleaned)
  } catch (e) {
    throw new Error(`LLM JSON inválido: ${(e as Error).message}`)
  }

  const parsed = llmOutputSchema.parse(json)
  return { raw: cleaned, parsed }
}

// ─── Fallback regex ─────────────────────────────────────────────────────────

function fallbackExtract(brief: string): LlmOutput {
  const lines = brief
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  const titulo = lines[0] ?? 'Título'
  const bullets = lines
    .slice(1)
    .filter((l) => /^[•\-*]/.test(l))
    .map((l) => ({
      texto: l.replace(/^[•\-*]\s*/, ''),
      icone: 'sparkle' as string,
    }))
    .slice(0, 4)
  return {
    titulo,
    bullets,
    badgeSubtema: null,
    iconeTopo: null,
    cardInferior: null,
    cardInferiorLonga: null,
    heroPrompt: null,
  }
}

// ─── Sanitiza ícone (garante que é um V2IconId) ─────────────────────────────

const VALID_ICON_IDS = new Set<string>([
  'casa-coracao', 'sparkle', 'estrela', 'check', 'coracao', 'cifrao',
  'etiqueta', 'escudo', 'relogio', 'raio', 'lampada', 'x-circulo',
])

function safeIcon(id: string | null | undefined, fallback: V2IconId = 'sparkle'): V2IconId {
  if (!id || !VALID_ICON_IDS.has(id)) return fallback
  return id as V2IconId
}

// ─── Decisão de variant ─────────────────────────────────────────────────────

function resolveVariant(
  templateType: 'capa' | 'cta-final',
  override: V2VariantOverride,
  titulo: string,
  bullets: string[],
): { variant: V2CapaVariant; reason: V2Plan['variantReason'] } {
  if (templateType === 'cta-final') {
    return { variant: 'capa-curta', reason: 'cta-final-forced' }
  }
  if (override === 'forcar-curta') return { variant: 'capa-curta', reason: 'override-curta' }
  if (override === 'forcar-longa') return { variant: 'capa-longa', reason: 'override-longa' }
  const total = totalCharCount(titulo, bullets)
  if (total <= 120 && bullets.length <= 4) {
    return { variant: 'capa-curta', reason: 'auto-curta' }
  }
  return { variant: 'capa-longa', reason: 'auto-longa' }
}

// ─── Helper: heroPrompt do upload (ignora) ──────────────────────────────────

function buildHero(input: V2Input, llmHeroPrompt: string | null): V2Plan['hero'] {
  if (input.modoGeracao === 'upload') {
    return { source: 'uploaded', uploadedUrl: input.imageUploadUrl! }
  }
  // IA: prioridade ao prompt explícito do user, depois LLM, depois fallback genérico.
  const prompt =
    input.imagePrompt ??
    llmHeroPrompt ??
    'cozy home interior, soft natural lighting, purple gradient background blue to violet, Instagram aesthetic, high quality'
  return { source: 'ai_generated', prompt }
}

// ─── Texto literal do botão CTA-FINAL (invariante REGRA #0.1) ───────────────

export const V2_CTA_FINAL_BUTTON_TEXT = 'Gostou? Compartilha para informar as amigas!'

// ─── Public API ─────────────────────────────────────────────────────────────

export interface PlanResult {
  plan: V2PlanParsed
  via: 'llm' | 'fallback'
  durationMs: number
  rawLlmOutput?: string
  errorReason?: string
}

export async function planV2(input: V2Input): Promise<PlanResult> {
  const t0 = Date.now()

  let llmOut: LlmOutput
  let via: 'llm' | 'fallback' = 'llm'
  let raw: string | undefined
  let errorReason: string | undefined

  try {
    const res = await callLlm(input.brief)
    llmOut = res.parsed
    raw = res.raw
  } catch (err) {
    via = 'fallback'
    errorReason = (err as Error).message
    llmOut = fallbackExtract(input.brief)
  }

  // Sanitiza ícones (LLM pode devolver id desconhecido).
  const bullets = llmOut.bullets.map((b) => ({
    texto: b.texto,
    icone: safeIcon(b.icone),
  }))

  const bulletsTextos = bullets.map((b) => b.texto)
  const { variant, reason } = resolveVariant(
    input.templateType,
    input.variantOverride ?? 'auto',
    llmOut.titulo,
    bulletsTextos,
  )

  // CTA-FINAL: força texto literal do botão (invariante REGRA #0.1)
  const ctaButtonTexto = input.templateType === 'cta-final' ? V2_CTA_FINAL_BUTTON_TEXT : undefined

  const planDraft: V2Plan = {
    templateType: input.templateType,
    variant,
    variantReason: reason,
    titulo: llmOut.titulo,
    bullets,
    badgeSubtema: llmOut.badgeSubtema
      ? { texto: llmOut.badgeSubtema.texto, icone: safeIcon(llmOut.badgeSubtema.icone, 'cifrao') }
      : undefined,
    iconeTopo: llmOut.iconeTopo ? safeIcon(llmOut.iconeTopo, 'casa-coracao') : undefined,
    cardInferior:
      llmOut.cardInferior && variant === 'capa-curta'
        ? {
            numero: llmOut.cardInferior.numero ?? undefined,
            titulo: llmOut.cardInferior.titulo,
            bullets: llmOut.cardInferior.bullets,
          }
        : undefined,
    cardInferiorLonga:
      llmOut.cardInferiorLonga && variant === 'capa-longa'
        ? {
            textoLongo: llmOut.cardInferiorLonga.textoLongo,
            destaque: llmOut.cardInferiorLonga.destaque,
            icone: safeIcon(llmOut.cardInferiorLonga.icone, 'coracao'),
          }
        : undefined,
    ctaButtonTexto,
    hero: buildHero(input, llmOut.heroPrompt),
    charCount: {
      titulo: llmOut.titulo.length,
      bulletsTotal: bulletsTextos.reduce((s, b) => s + b.length, 0),
      total: totalCharCount(llmOut.titulo, bulletsTextos),
    },
  }

  // Default iconeTopo='casa-coracao' pra CAPA-LONGA sem indicação LLM.
  if (variant === 'capa-longa' && !planDraft.iconeTopo) {
    planDraft.iconeTopo = 'casa-coracao'
  }

  const plan = v2PlanSchema.parse(planDraft)
  return {
    plan,
    via,
    durationMs: Date.now() - t0,
    rawLlmOutput: raw,
    errorReason,
  }
}
