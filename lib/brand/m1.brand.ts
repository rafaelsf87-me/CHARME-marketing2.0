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
    falModels: {
      // Mask pré-gerada por template (offline, via script).
      // EVF-SAM: SAM com text-prompt (substitui grounded-sam-2, que não existe na fal).
      groundedSam: 'fal-ai/evf-sam',
      // Step 1 do Pipeline A (capa neutra/swatch).
      fluxKontext: 'fal-ai/flux-pro/kontext',
      // Step 2 (aplicar swatch no template via inpainting). Aceita
      // image_url + mask_url + reference_image_url + prompt. Resolve DEC-006.
      fluxKontextInpaint: 'fal-ai/flux-kontext-lora/inpaint',
    },
  },
} as const

export type BrandM1 = typeof brandM1
