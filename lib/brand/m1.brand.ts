import { brandBase } from './base.config'

// M1 não usa tipografia nem paleta de marca (saída é foto, não composição).
// Brand config é fonte única de dimensões, parâmetros de cache e modelos fal.
export const brandM1 = {
  ...brandBase,
  dimensions: {
    // Saída final dos 4 tipos de foto.
    final: { width: 1080, height: 1080 },
    // Metade da composição split-screen do Detalhe Tecido (close + zoom).
    detalheHalf: { width: 540, height: 1080 },
  },
  cache: {
    capaNeutra: {
      ttlMinutes: 30,
      maxEntries: 50,
    },
  },
  pipeline: {
    timeoutMs: 60_000,
    // Pipeline A (Estampada/Alto Relevo): $0.12/render (nano-banana 2K, sem Step 1).
    // Capa Lisa: mesmo nano-banana, mesmo custo.
    // Step 1 flux-pro/kontext desativado em 2026-05 (REF-2 = foto do rolo direto).
    step2Resolution: '2K' as const,
    falModels: {
      // Mask EVF-SAM permanece registrada por compatibilidade (geração offline
      // foi descontinuada na migração nano-banana). Mantida até confirmar que
      // o pipeline novo cobre todos os 16 templates.
      groundedSam: 'fal-ai/evf-sam',
      // Step 1 do Pipeline A (capa neutra/swatch) — DESATIVADO no pipeline,
      // mantido como fallback. Helper callFluxKontext permanece em fal-client.ts.
      fluxKontext: 'fal-ai/flux-pro/kontext',
      // Step 2 — Gemini 2.5 Image Edit (nano-banana-2) via fal.ai.
      // Aceita image_urls[] + prompt. Sem mask, sem strength: modelo black-box.
      // Substituiu flux-kontext-lora/inpaint (ignorava reference_image_url).
      nanoBanana: 'fal-ai/nano-banana-2/edit',
    },
  },
} as const

export type BrandM1 = typeof brandM1
