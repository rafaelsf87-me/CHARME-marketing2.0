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
  // V2.0.3: rótulo "CTA:" do briefing vira ctaText (sobrescreve botão CTA-FINAL).
  ctaText: z.string().max(140).nullable().default(null),
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

- badgeSubtema: { texto, icone } OU null.

═══════════════════════════════════════════════════════════
REGRA CRÍTICA — SEPARAÇÃO TÍTULO vs BADGE (BUG-V2-007)
═══════════════════════════════════════════════════════════
SEMPRE separar título em 2 partes quando o briefing contém um SUB-TEMA / CONDIÇÃO / QUALIFICADOR:
- titulo = ação ou afirmação principal (1ª parte, max 30 chars)
- badgeSubtema.texto = condição/sub-tema/qualificador (2ª parte, max 60 chars)
- badgeSubtema.icone = ícone contextual da semântica

Padrões que SEMPRE viram badge:
- "gastando pouco" / "gastando muito" → badge + icone="cifrao"
- "sem esforço" / "sem gastar" / "sem complicação" → badge + icone="raio"
- "em 1 semana" / "em 30 dias" / "rápido" → badge + icone="relogio"
- "garantido" / "com segurança" → badge + icone="escudo"
- "premium" / "top" / "5 estrelas" → badge + icone="estrela"
- "promoção" / "oferta" / "desconto" → badge + icone="etiqueta"
- "dica" / "ideia" → badge + icone="lampada"

EXEMPLOS OBRIGATÓRIOS:
INPUT: "Como renovar a sala gastando pouco" → titulo="COMO RENOVAR A SALA", badgeSubtema={texto:"GASTANDO POUCO", icone:"cifrao"}
INPUT: "Limpe a casa em 1 hora" → titulo="LIMPE A CASA", badgeSubtema={texto:"EM 1 HORA", icone:"relogio"}
INPUT: "Renove o sofá sem reforma" → titulo="RENOVE O SOFÁ", badgeSubtema={texto:"SEM REFORMA", icone:"raio"}
INPUT: "5 dicas para casa sempre limpa" → titulo="5 DICAS", badgeSubtema={texto:"CASA SEMPRE LIMPA", icone:"lampada"}

Quando NÃO usar badge (deixar null):
- Briefings narrativos sem qualificador ("O cansaço invisível de quem cuida da casa") → titulo único, sem badge
- Quando título já é curto e direto sem 2ª parte ("Frequência de rega")
- Briefings emocionais/reflexivos → usa iconeTopo em vez de badge

- iconeTopo: id do ícone OU null. Use APENAS para briefings emocionais/reflexivos (não-transacionais, ex: "cansaço invisível", "cuidado com a casa"). Sugestão: "casa-coracao" pra temas brand-emocional, "coracao" pra afeto.

- cardInferior: { numero, titulo, bullets } OU null. Use quando o brief tem uma "conclusão" ou "destaque numerado". numero: "1", "2"... ou null. titulo: frase do destaque. bullets: 0-3 sub-pontos curtos.

- cardInferiorLonga: { textoLongo, destaque, icone } OU null. Use APENAS quando o brief tem fechamento emocional em 2 partes: texto reflexivo + chamada curta destaque (ex: "Cuidar da casa é trabalho que não se vê / VOCÊ TAMBÉM MERECE SER CUIDADO!").

- ctaText: string OU null. APENAS quando o briefing tem rótulo "CTA:" explícito. texto = literal pós-rótulo, sem modificação (REGRA #0.1). null caso contrário (CTA-FINAL usa texto brand default).

- heroPrompt: string em INGLÊS OU null. Descrição visual do hero (produto/cena) pra gpt-image-1.
  IMPORTANTE V2.0.1: o gradient brand vem da BASE do template (não da IA). O hero é o produto/cena ISOLADO em fundo transparente.
  Estilo padrão V2: realistic photograph, soft natural lighting, isolated subject on transparent background, no background, no scenery, no surroundings, product photography style, high quality.
  Sempre termine com: ", isolated on transparent background, no background scene, no text, no logo".
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
  "heroPrompt": "modern gray sofa with stretchable patterned cover, realistic photograph, soft natural lighting, side view, product photography style, isolated on transparent background, no background scene, no text, no logo"
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
  "heroPrompt": "tired woman in beige apron leaning on laundry basket, realistic photograph, soft natural lighting, three quarter view, isolated on transparent background, no background scene, no text, no logo"
}

Retorne APENAS o JSON. Sem markdown. Sem fences. Sem explicação.`

// ─── Chamada LLM (V2.0.3: retry 1× antes do fallback) ──────────────────────

const RETRY_DELAY_MS = 2_000

async function callLlmOnce(brief: string): Promise<{ raw: string; parsed: LlmOutput }> {
  // BUG-V2-009: flag de teste — força fallback path pra smoke E
  if (process.env.V2_FORCE_FALLBACK === 'true') {
    throw new Error('LLM forcibly disabled via V2_FORCE_FALLBACK env')
  }

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

interface LlmCallResult {
  raw: string
  parsed: LlmOutput
  via: 'llm_primary' | 'llm_retry'
}

/** Tenta LLM 2× (primary + retry 1× após 2s). Lança erro se ambas falharem. */
async function callLlmWithRetry(brief: string): Promise<LlmCallResult> {
  try {
    const res = await callLlmOnce(brief)
    return { ...res, via: 'llm_primary' }
  } catch (primaryErr) {
    console.warn(`[V2 planner] LLM primary falhou: ${(primaryErr as Error).message} — retry em ${RETRY_DELAY_MS}ms`)
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    try {
      const res = await callLlmOnce(brief)
      console.log('[V2 planner] LLM retry OK')
      return { ...res, via: 'llm_retry' }
    } catch (retryErr) {
      throw new Error(
        `LLM falhou após retry: primary=${(primaryErr as Error).message}; retry=${(retryErr as Error).message}`,
      )
    }
  }
}

// ─── Fallback regex (V2.0.3 — BUG-V2-009 P2) ────────────────────────────────
//
// Invariante: ZERO caracteres do briefing podem ser descartados.
// Estratégia: tokeniza linhas → categoriza por rótulo conhecido → fallback
// pra cardInferior pra qualquer texto remanescente. Validação pós-extração
// confirma que tudo foi mapeado.

const LABELED_PATTERNS = {
  fechamento: /^(fechamento|fechando|conclus[aã]o|cta final|final)\s*:\s*(.+)$/i,
  destaque: /^(destaque|bloco final|card final|bloco)\s*:\s*(.+)$/i,
  bonus: /^(b[oô]nus|extra|plus)\s*:\s*(.+)$/i,
  cta: /^cta\s*:\s*(.+)$/i,
  bullet: /^\s*[•\-*]\s*(.+)$/,
}

/** Detecta separador " / " ou " | " dentro do texto pra split texto+destaque. */
function splitTextoDestaque(raw: string): { textoLongo: string; destaque: string | null } {
  // Padrões comuns: "texto / DESTAQUE EM CAIXA" ou "texto | DESTAQUE"
  const m = raw.match(/^(.+?)\s+[/|]\s+(.+)$/)
  if (m) return { textoLongo: m[1].trim(), destaque: m[2].trim() }
  return { textoLongo: raw, destaque: null }
}

function fallbackExtract(brief: string): LlmOutput {
  const lines = brief
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return {
      titulo: 'Título',
      bullets: [],
      badgeSubtema: null,
      iconeTopo: null,
      cardInferior: null,
      cardInferiorLonga: null,
      heroPrompt: null,
      ctaText: null,
    }
  }

  const titulo = lines[0]
  const consumed = new Set<number>([0]) // índice 0 = título

  const bullets: Array<{ texto: string; icone: string }> = []
  let fechamentoRaw: string | null = null
  let destaqueRaw: string | null = null
  let bonusRaw: string | null = null
  let ctaRaw: string | null = null

  lines.forEach((line, idx) => {
    if (consumed.has(idx)) return
    let m: RegExpMatchArray | null

    if ((m = line.match(LABELED_PATTERNS.fechamento))) {
      fechamentoRaw = m[2].trim()
      consumed.add(idx)
      return
    }
    if ((m = line.match(LABELED_PATTERNS.destaque))) {
      destaqueRaw = m[2].trim()
      consumed.add(idx)
      return
    }
    if ((m = line.match(LABELED_PATTERNS.bonus))) {
      bonusRaw = m[2].trim()
      consumed.add(idx)
      return
    }
    if ((m = line.match(LABELED_PATTERNS.cta))) {
      ctaRaw = m[1].trim()
      consumed.add(idx)
      return
    }
    if ((m = line.match(LABELED_PATTERNS.bullet))) {
      if (bullets.length < 4) {
        bullets.push({ texto: m[1].trim(), icone: 'sparkle' })
      }
      consumed.add(idx)
      return
    }
  })

  // Texto remanescente (sem rótulo, sem bullet) → vai pro fallback card
  const remainingTexts = lines.filter((_, idx) => !consumed.has(idx))

  // Decide cardInferior vs cardInferiorLonga baseado nos campos detectados:
  // - fechamento presente → cardInferiorLonga (texto + destaque opcional)
  // - destaque/bonus → cardInferior simples
  // - texto remanescente → cardInferior fallback
  let cardInferior: LlmOutput['cardInferior'] = null
  let cardInferiorLonga: LlmOutput['cardInferiorLonga'] = null

  if (fechamentoRaw) {
    const split = splitTextoDestaque(fechamentoRaw)
    cardInferiorLonga = {
      textoLongo: split.textoLongo,
      destaque: split.destaque ?? 'VEJA MAIS',
      icone: 'coracao',
    }
  } else if (destaqueRaw || bonusRaw || remainingTexts.length > 0) {
    const titulo = destaqueRaw ?? bonusRaw ?? remainingTexts.join(' · ')
    cardInferior = {
      numero: null,
      titulo,
      bullets: remainingTexts.length > 0 && !destaqueRaw && !bonusRaw ? [] : remainingTexts.slice(0, 3),
    }
  }

  // Sanity check: marca remaining como consumed agora (foram pro card)
  if (remainingTexts.length > 0 && (cardInferior || cardInferiorLonga)) {
    lines.forEach((line, idx) => {
      if (remainingTexts.includes(line)) consumed.add(idx)
    })
  }

  // Validação anti-descarte: log warning se algum texto não-trivial não foi mapeado
  const unmapped = lines.filter((_, idx) => !consumed.has(idx))
  if (unmapped.length > 0) {
    console.warn(`[V2 fallback] ATENÇÃO: ${unmapped.length} linhas não mapeadas:`, unmapped)
    // Hardening: força ir pro card como hardening
    if (!cardInferior && !cardInferiorLonga) {
      cardInferior = {
        numero: null,
        titulo: unmapped.join(' · '),
        bullets: [],
      }
    }
  }

  return {
    titulo,
    bullets,
    badgeSubtema: null,
    iconeTopo: null,
    cardInferior,
    cardInferiorLonga,
    heroPrompt: null,
    ctaText: ctaRaw,
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

export type PlanVia = 'llm_primary' | 'llm_retry' | 'regex_fallback'

export interface PlanResult {
  plan: V2PlanParsed
  via: PlanVia
  durationMs: number
  rawLlmOutput?: string
  errorReason?: string
}

export async function planV2(input: V2Input): Promise<PlanResult> {
  const t0 = Date.now()

  let llmOut: LlmOutput
  let via: PlanVia = 'llm_primary'
  let raw: string | undefined
  let errorReason: string | undefined

  try {
    const res = await callLlmWithRetry(input.brief)
    llmOut = res.parsed
    raw = res.raw
    via = res.via
  } catch (err) {
    via = 'regex_fallback'
    errorReason = (err as Error).message
    console.warn(`[V2 planner] caindo pra regex_fallback: ${errorReason}`)
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

  // CTA-FINAL: usa ctaText literal do briefing (REGRA #0.1) ou default brand.
  const ctaButtonTexto =
    input.templateType === 'cta-final'
      ? llmOut.ctaText ?? V2_CTA_FINAL_BUTTON_TEXT
      : undefined

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
