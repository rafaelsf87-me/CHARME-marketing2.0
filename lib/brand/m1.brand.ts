import { brandBase } from './base.config'

// M1 não usa tipografia nem paleta de marca (saída é foto, não composição).
// Brand config é fonte única de dimensões, parâmetros de cache e modelos fal.
export const brandM1 = {
  ...brandBase,
  dimensions: {
    fotoCapa: { width: 1080, height: 1080 },
    fotoAmbiente: { width: 1080, height: 1080 },
    fotoElastico: { width: 1080, height: 1080 },
    fotoDetalheTecido: { width: 1080, height: 1080 },
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
      groundedSam: 'fal-ai/grounded-sam-2',
      // Step 1 (capa neutra/swatch) + Pipeline B (Elástico + Detalhe Tecido).
      fluxKontext: 'fal-ai/flux-pro/kontext',
      // Step 2 (aplicar swatch no template via inpainting). Aceita
      // image_url + mask_url + reference_image_url + prompt. Resolve DEC-006.
      fluxKontextInpaint: 'fal-ai/flux-kontext-lora/inpaint',
    },
  },
} as const

export type BrandM1 = typeof brandM1
