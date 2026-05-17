import { fal } from '@fal-ai/client'
import type { FalConfig } from './types'

// Cliente FAL do M3.
// Fase 1: callGptImage1Title (título 3D balão).
// Fase 2.1: callFluxAtriz (Flux Pro v1.1 Ultra) + callRembg (rembg).
// Ver DEC-M3-002 (título) + DEC-M3-003 (atriz IA/Upload) em DIVIDAS.

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

// ─── Atriz ────────────────────────────────────────────────────────────────────

const FLUX_ATRIZ_ENDPOINT = 'fal-ai/flux-pro/v1.1-ultra'

export interface CallFluxAtrizArgs {
  prompt: string
  // 3:4 = portrait padrão do M3 (atriz vertical). Override só se necessário.
  aspectRatio?: '3:4' | '4:3' | '1:1' | '9:16' | '16:9' | '2:3' | '3:2'
}

// Gera foto de atriz via Flux Pro v1.1 Ultra (text-to-image). Retorna Buffer
// do PNG cru — ainda COM fundo. Passar por callRembg() pra cutout transparente.
export async function callFluxAtriz(args: CallFluxAtrizArgs): Promise<Buffer> {
  const { prompt, aspectRatio = '3:4' } = args

  const { data } = await fal.subscribe(FLUX_ATRIZ_ENDPOINT, {
    input: {
      prompt,
      aspect_ratio: aspectRatio,
      num_images: 1,
      output_format: 'png',
      // safety_tolerance '6' (mais permissivo) — INV-M2-001 documentou
      // falsos-positivos NSFW do Flux com prompts inocentes em pt-BR.
      // Atriz é "Brazilian woman aged 35-45" + roupa neutra; risco zero.
      safety_tolerance: '6',
    },
    logs: false,
  })

  const output = data as FalOutput
  const url = output.images?.[0]?.url
  if (!url) throw new Error(`[M3] FAL ${FLUX_ATRIZ_ENDPOINT} não retornou URL`)

  console.log(`[M3] ${FLUX_ATRIZ_ENDPOINT} OK → ${url}`)

  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`[M3] Falha ao baixar atriz do FAL (${resp.status})`)
  return Buffer.from(await resp.arrayBuffer())
}

const REMBG_ENDPOINT = 'fal-ai/imageutils/rembg'

// ─── Decoração IA (fallback quando banco curado não cobre) ────────────────────

const FLUX_DECORACAO_ENDPOINT = 'fal-ai/flux-pro/v1.1-ultra'

export interface CallFluxDecoracaoArgs {
  prompt: string
}

// Gera decoração visual via Flux (PNG cru com fundo). Pareada com callRembg
// pelo orquestrador pra produzir cutout transparente. Aspect 1:1 — decorações
// são elementos isolados quadrados (corações, ícones, etc).
export async function callFluxDecoracao(args: CallFluxDecoracaoArgs): Promise<Buffer> {
  const { prompt } = args

  // Reforço do prompt pra forçar isolamento + estilo coerente com o banco
  // Fluent Emoji 3D (caso o user esqueça de pedir).
  const reforced = `${prompt}. Isolated 3D illustration on plain neutral background (will be removed), centered subject, glossy 3D style consistent with Microsoft Fluent Emoji aesthetic, soft studio lighting.`

  const { data } = await fal.subscribe(FLUX_DECORACAO_ENDPOINT, {
    input: {
      prompt: reforced,
      aspect_ratio: '1:1',
      num_images: 1,
      output_format: 'png',
      safety_tolerance: '6',
    },
    logs: false,
  })

  const output = data as FalOutput
  const url = output.images?.[0]?.url
  if (!url) throw new Error(`[M3] FAL ${FLUX_DECORACAO_ENDPOINT} não retornou URL`)

  console.log(`[M3] ${FLUX_DECORACAO_ENDPOINT} (decoração) OK → ${url}`)

  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`[M3] Falha ao baixar decoração do FAL (${resp.status})`)
  return Buffer.from(await resp.arrayBuffer())
}

// ─── Rembg ────────────────────────────────────────────────────────────────────

// Remove fundo do Buffer de entrada via rembg do FAL. Retorna PNG com alpha.
// FAL aceita URL pública — fazemos upload temporário do Buffer via storage.
export async function callRembg(input: Buffer): Promise<Buffer> {
  // Buffer → ArrayBuffer pra satisfazer o tipo BlobPart do TS strict.
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
  if (!url) throw new Error(`[M3] FAL ${REMBG_ENDPOINT} não retornou URL`)

  console.log(`[M3] ${REMBG_ENDPOINT} OK → ${url}`)

  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`[M3] Falha ao baixar output do rembg (${resp.status})`)
  return Buffer.from(await resp.arrayBuffer())
}
