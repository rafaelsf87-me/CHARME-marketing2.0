/**
 * T2 FAL Client — chamadas isoladas do T2
 *
 * Pattern alinhado ao M3 (lib/m3/fal-client.ts). Isolado de T1 e M3
 * conforme invariante I3 (DEC-M2-005). Apenas reusa `@fal-ai/client` lib.
 *
 * Uso:
 *   - callGptImage1Product: gera asset isolado (produto, cena) via
 *     gpt-image-1 high. Background transparent quando possível, rembg
 *     fallback se vier com fundo.
 *   - callRembg: remove fundo do PNG buffer (storage upload + edit).
 */

import { fal } from '@fal-ai/client'

// fal.config é idempotente — chamadas múltiplas do mesmo módulo são OK.
// FAL_KEY pode estar undefined em build time (Next type-check) — só falha
// na chamada real, controlado via tente/catch em assets/.
fal.config({ credentials: process.env.FAL_KEY })

type FalImageRef = { url?: string }
type FalOutput = { images?: FalImageRef[] }

const GPT_IMAGE_1_TEXT_ENDPOINT = 'fal-ai/gpt-image-1/text-to-image'
const REMBG_ENDPOINT = 'fal-ai/imageutils/rembg'

export interface CallGptImage1ProductArgs {
  prompt: string
  /** Default 'transparent' pra produtos isolados; 'auto' pra cenas. */
  background?: 'transparent' | 'auto' | 'opaque'
  /** Default '1024x1024'. */
  imageSize?: '1024x1024' | '1536x1024' | '1024x1536'
}

/**
 * Gera asset isolado via gpt-image-1 high. Retorna Buffer pra cache em
 * memória sem depender de Blob/disco.
 */
export async function callGptImage1Product(args: CallGptImage1ProductArgs): Promise<Buffer> {
  const { prompt, background = 'transparent', imageSize = '1024x1024' } = args

  const { data } = await fal.subscribe(GPT_IMAGE_1_TEXT_ENDPOINT, {
    input: {
      prompt,
      image_size: imageSize,
      quality: 'high',
      output_format: 'png',
      background,
      num_images: 1,
    },
    logs: false,
  })

  const output = data as FalOutput
  const url = output.images?.[0]?.url
  if (!url) throw new Error(`[T2] FAL ${GPT_IMAGE_1_TEXT_ENDPOINT} não retornou URL de imagem`)

  console.log(`[T2] ${GPT_IMAGE_1_TEXT_ENDPOINT} OK → ${url}`)

  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`[T2] Falha ao baixar asset do FAL (${resp.status})`)
  return Buffer.from(await resp.arrayBuffer())
}

/**
 * Remove fundo do PNG buffer via rembg. Pareado com callGptImage1Product
 * quando background='auto' (algumas runs gpt-image-1 ignoram transparent).
 */
export async function callRembg(input: Buffer): Promise<Buffer> {
  const arrayBuffer = input.buffer.slice(
    input.byteOffset,
    input.byteOffset + input.byteLength,
  ) as ArrayBuffer
  const inputBlob = new Blob([arrayBuffer], { type: 'image/png' })
  const uploadedUrl = await fal.storage.upload(inputBlob)

  const { data } = await fal.subscribe(REMBG_ENDPOINT, {
    input: { image_url: uploadedUrl },
    logs: false,
  })

  const output = data as { image?: { url?: string } }
  const url = output.image?.url
  if (!url) throw new Error(`[T2] FAL ${REMBG_ENDPOINT} não retornou URL`)

  console.log(`[T2] ${REMBG_ENDPOINT} OK → ${url}`)

  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`[T2] Falha ao baixar output do rembg (${resp.status})`)
  return Buffer.from(await resp.arrayBuffer())
}

/**
 * Detecta se o buffer PNG já tem alpha real (transparência presente)
 * amostrando 9 pontos. Se ≥4 dos 9 forem totalmente opacos no canto/borda,
 * provavelmente o output veio com fundo (rembg fallback necessário).
 *
 * Heurística rápida — não substitui rembg, só evita chamada desnecessária.
 */
export async function detectsAlphaPresent(buffer: Buffer): Promise<boolean> {
  // Import dinâmico pra evitar custo de Sharp quando função não é chamada.
  const sharp = (await import('sharp')).default
  const meta = await sharp(buffer).metadata()
  if (!meta.hasAlpha) return false
  // Amostra 9 pixels (3×3 grid).
  const { data, info } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height
  const channels = info.channels
  let transparentPixels = 0
  const samples: [number, number][] = [
    [10, 10],
    [w - 10, 10],
    [Math.floor(w / 2), 10],
    [10, Math.floor(h / 2)],
    [w - 10, Math.floor(h / 2)],
    [10, h - 10],
    [w - 10, h - 10],
    [Math.floor(w / 2), h - 10],
    [Math.floor(w / 2), Math.floor(h / 2)],
  ]
  for (const [x, y] of samples) {
    const idx = (y * w + x) * channels
    const a = data[idx + 3] ?? 255
    if (a < 50) transparentPixels++
  }
  return transparentPixels >= 3
}
