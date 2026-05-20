import type { Template } from '../types'

/**
 * V2.0 (feat/v2-templates) — Template 2: Fixos.
 *
 * 3 templates fixos atômicos:
 *  - CAPA-CURTA  (briefings curtos/transacionais, ≤120 chars)
 *  - CAPA-LONGA  (briefings longos/emocionais, >120 chars)
 *  - CTA-FINAL   (base CAPA-CURTA + botão CTA + footer)
 *
 * Roteamento: UI vai pra <V2Form /> quando este id é selecionado.
 * API: POST /api/imagens/m2/v2/generate (schema próprio em lib/m2/v2/schema.ts).
 *
 * NÃO usa buildPrompt/falConfig — pipeline V2 é orquestrado por lib/m2/v2/render.ts.
 */
export const v2FixosTemplate: Template = {
  id: 'v2-fixos',
  nome: 'Template 2 — Fixos',
  descricao: 'Capas e CTA finalizados (auto-fit, ícones brand, conectores).',
  status: 'ativo',
  pipeline: 'hibrido-compositing',
}
