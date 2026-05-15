import { fal } from '@fal-ai/client'
import { brandM1 } from '@/lib/brand/m1.brand'

// Cada endpoint usa seu próprio tipo de input. Os endpoints não estão todos
// mapeados no `EndpointTypeMap` do SDK 1.10, então tipamos localmente o shape
// mínimo que consumimos. Sem `any`.
fal.config({ credentials: process.env.FAL_KEY })

// ─── Inputs locais (mirror das docs oficiais) ──────────────────

// `fal-ai/flux-pro/kontext` (Step 1 — capa neutra/swatch).
type FluxKontextInput = {
  image_url: string
  prompt: string
  guidance_scale?: number
  output_format?: 'png' | 'jpeg'
}

// `fal-ai/nano-banana-2/edit` (Step 2 — aplica swatch no template).
// Múltiplas referências passam como array em `image_urls` (ordem importa:
// [REF-1 = template, REF-2 = swatch]). Sem mask, sem strength.
type NanoBananaEditInput = {
  prompt: string
  image_urls: string[]
  num_images?: number
  aspect_ratio?: '1:1' | '21:9' | '16:9' | '3:2' | '4:3' | '5:4' | '4:5' | '3:4' | '2:3' | '9:16' | '4:1' | '1:4' | '8:1' | '1:8' | 'auto'
  output_format?: 'jpeg' | 'png' | 'webp'
  resolution?: '0.5K' | '1K' | '2K' | '4K'
  safety_tolerance?: '1' | '2' | '3' | '4' | '5' | '6'
  seed?: number
  system_prompt?: string
  thinking_level?: 'minimal' | 'high'
}

// ─── Outputs ───────────────────────────────────────────────────

type FalImageRef = { url?: string }
type FluxKontextOutput = {
  images?: FalImageRef[]
  image?: FalImageRef
}
type NanoBananaEditOutput = {
  images?: FalImageRef[]
  description?: string
}
type GroundedSamOutput = {
  masks?: FalImageRef[]
  image?: FalImageRef
  images?: FalImageRef[]
}

// ─── Helpers ───────────────────────────────────────────────────

async function uploadBuffer(buf: Buffer, mime = 'image/png'): Promise<string> {
  return fal.storage.upload(new Blob([new Uint8Array(buf)], { type: mime }))
}

async function downloadAsBuffer(url: string, label: string): Promise<Buffer> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Falha ao baixar ${label}: ${resp.status}`)
  return Buffer.from(await resp.arrayBuffer())
}

// ═══════════════════════════════════════════════════════════════
// Step 1 — capa neutra (swatch) do Pipeline A
// Endpoint: fal-ai/flux-pro/kontext
// ═══════════════════════════════════════════════════════════════

export type FluxKontextArgs = {
  imageBuffer?: Buffer
  imageUrl?: string
  prompt: string
}

export type FluxKontextResult = {
  buffer: Buffer
  outputUrl: string
}

export async function callFluxKontext(args: FluxKontextArgs): Promise<FluxKontextResult> {
  if (!args.imageBuffer && !args.imageUrl) {
    throw new Error('callFluxKontext: forneça imageBuffer ou imageUrl')
  }
  const imageInput: string = args.imageBuffer
    ? await uploadBuffer(args.imageBuffer)
    : (args.imageUrl as string)

  const input: FluxKontextInput = {
    image_url: imageInput,
    prompt: args.prompt,
    // 3.5 ampliava escala da estampa ~3-4×. 5 reduz para ~2× (iter 1).
    // 7 entrou em platô (mesma escala) e degradou Step 2 ligeiramente.
    // Mantém 5; escala fiel agora vem de REF-3 (foto original) no Step 2.
    guidance_scale: 5,
    output_format: 'png',
  }

  const { data } = await fal.subscribe(brandM1.pipeline.falModels.fluxKontext, {
    input,
    logs: false,
  })

  const output: FluxKontextOutput = data
  const outputUrl = output.images?.[0]?.url ?? output.image?.url
  if (!outputUrl) throw new Error('Flux Kontext não retornou URL de saída')

  console.log('[M1][Step1] Output URL:', outputUrl)
  const buffer = await downloadAsBuffer(outputUrl, 'output Flux Kontext')
  return { buffer, outputUrl }
}

// ═══════════════════════════════════════════════════════════════
// Step 2 — aplicar capa no template via nano-banana-2 (Gemini 2.5)
// Endpoint: fal-ai/nano-banana-2/edit
// Black-box: só prompt + image_urls[] (REF-1 = template, REF-2 = foto do tecido).
// ═══════════════════════════════════════════════════════════════

export type NanoBananaEditArgs = {
  templateBuffer: Buffer
  // REF-2: foto do rolo de tecido (estampa plana em fundo neutro).
  // Define padrão, cor, textura e escala física. Capa Lisa: ausente.
  referenceUrl?: string
  prompt: string
}

export async function callNanoBananaEdit(args: NanoBananaEditArgs): Promise<Buffer> {
  const templateUrl = await uploadBuffer(args.templateBuffer)

  // Ordem importa: REF-1 (template), REF-2 (foto do tecido).
  const imageUrls: string[] = [templateUrl]
  if (args.referenceUrl) imageUrls.push(args.referenceUrl)

  const input: NanoBananaEditInput = {
    prompt: args.prompt,
    image_urls: imageUrls,
    num_images: 1,
    aspect_ratio: '1:1',
    output_format: 'png',
    resolution: brandM1.pipeline.step2Resolution,
  }

  const { data } = await fal.subscribe(brandM1.pipeline.falModels.nanoBanana, {
    input,
    logs: false,
  })

  const output: NanoBananaEditOutput = data
  const outputUrl = output.images?.[0]?.url
  if (!outputUrl) throw new Error('nano-banana-2 não retornou URL de saída')

  console.log('[M1][Step2] Output URL:', outputUrl)
  return downloadAsBuffer(outputUrl, 'output nano-banana-2')
}

// ═══════════════════════════════════════════════════════════════
// Mask offline (script m1:generate-masks) — descontinuado
// Endpoint: fal-ai/evf-sam
// Mantido por compatibilidade até confirmar nano-banana cobre todos os casos.
// ═══════════════════════════════════════════════════════════════

export type GroundedSamArgs = {
  imageBuffer: Buffer
  textPrompt: string
}

export async function callGroundedSam(args: GroundedSamArgs): Promise<Buffer> {
  const imageInput = await uploadBuffer(args.imageBuffer)

  const { data } = await fal.subscribe(brandM1.pipeline.falModels.groundedSam, {
    input: {
      image_url: imageInput,
      prompt: args.textPrompt,
    },
    logs: false,
  })

  const output: GroundedSamOutput = data
  const maskUrl =
    output.masks?.[0]?.url ?? output.image?.url ?? output.images?.[0]?.url
  if (!maskUrl) throw new Error('Grounded-SAM não retornou mask')

  return downloadAsBuffer(maskUrl, 'mask Grounded-SAM')
}
