import { fal } from '@fal-ai/client'
import type { FalConfig } from './types'

// Cliente FAL do M3. Fase 1 cobre apenas callGptImage1Title (text-to-image
// pro título isolado). callFluxAtriz + callRembg entram na Fase 2 quando
// a atriz for implementada (ver DEC-M3-003).

fal.config({ credentials: process.env.FAL_KEY })

type FalImageRef = { url?: string }
type FalOutput = { images?: FalImageRef[] }

export interface CallGptImage1TitleArgs {
  prompt: string
  falConfig: FalConfig
}

// Gera o PNG transparente do título via gpt-image-1 high. Retorna Buffer pra
// permitir cache em memória sem dependência de blob/disco. URL FAL é log-only.
export async function callGptImage1Title(args: CallGptImage1TitleArgs): Promise<Buffer> {
  const { prompt, falConfig } = args

  const { data } = await fal.subscribe(falConfig.endpointText, {
    input: {
      prompt,
      image_size: falConfig.imageSize,
      quality: falConfig.quality,
      output_format: falConfig.outputFormat,
      background: falConfig.background,
      num_images: falConfig.numImages,
    },
    logs: false,
  })

  const output = data as FalOutput
  const url = output.images?.[0]?.url
  if (!url) throw new Error(`[M3] FAL ${falConfig.endpointText} não retornou URL de imagem`)

  console.log(`[M3] ${falConfig.endpointText} OK → ${url}`)

  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`[M3] Falha ao baixar título do FAL (${resp.status})`)
  return Buffer.from(await resp.arrayBuffer())
}
