import { fal } from '@fal-ai/client'
import type { FalConfig } from './templates/types'

// Schema validado contra docs FAL em 18/05/2026 (ver DEC-M2-001 em DIVIDAS).
// gpt-image-1 tem dois endpoints: text-to-image (sem refs) e edit-image
// (com refs em image_urls[]). image_size é enum '1024x1024' | '1536x1024' |
// '1024x1536' | 'auto' — não usa 'portrait_4_3'.

fal.config({ credentials: process.env.FAL_KEY })

// Input compartilhado entre text-to-image e edit-image. `image_urls` e
// `input_fidelity` são exclusivos do edit-image.
type GptImageInput = {
  prompt: string
  image_size: FalConfig['imageSize']
  quality: FalConfig['quality']
  output_format: FalConfig['outputFormat']
  background: FalConfig['background']
  num_images: number
  // Edit-image only:
  image_urls?: string[]
  input_fidelity?: FalConfig['inputFidelity']
}

type FalImageRef = { url?: string }
type GptImageOutput = { images?: FalImageRef[] }

export interface CallGptImageArgs {
  prompt: string
  falConfig: FalConfig
  // URLs públicas (Vercel Blob) das PNGs de referência. Vazio/undefined
  // = chama text-to-image; ≥1 = chama edit-image.
  referenceUrls?: string[]
}

/**
 * Chama gpt-image-1 via FAL. Roteia pra text-to-image ou edit-image conforme
 * presença de referenceUrls. Retorna a URL da imagem gerada (CDN do fal.ai).
 */
export async function callGptImage(args: CallGptImageArgs): Promise<string> {
  const { prompt, falConfig, referenceUrls } = args
  const hasRefs = (referenceUrls?.length ?? 0) > 0

  const endpoint = hasRefs ? falConfig.endpointEdit : falConfig.endpointText

  const input: GptImageInput = {
    prompt,
    image_size: falConfig.imageSize,
    quality: falConfig.quality,
    output_format: falConfig.outputFormat,
    background: falConfig.background,
    num_images: falConfig.numImages,
  }

  if (hasRefs) {
    input.image_urls = referenceUrls
    input.input_fidelity = falConfig.inputFidelity
  }

  const { data } = await fal.subscribe(endpoint, { input, logs: false })
  const output: GptImageOutput = data
  const url = output.images?.[0]?.url
  if (!url) throw new Error(`[M2] FAL ${endpoint} não retornou URL de imagem`)

  console.log(`[M2] ${endpoint} OK → ${url}`)
  return url
}
