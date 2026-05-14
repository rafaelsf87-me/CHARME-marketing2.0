import { fal } from '@fal-ai/client'
import { brandM1 } from '@/lib/brand/m1.brand'

// Cada endpoint usa seu próprio tipo de input (DEC-006 resolvida).
// Os endpoints não estão todos mapeados no `EndpointTypeMap` exportado
// pelo SDK 1.10, então tipamos localmente o shape mínimo que consumimos.
// Sem `any`.
fal.config({ credentials: process.env.FAL_KEY })

// ─── Inputs locais (mirror das docs oficiais) ──────────────────

// `fal-ai/flux-pro/kontext` (Step 1 + Pipeline B)
// Aceita apenas image_url + prompt + ajustes básicos.
type FluxKontextInput = {
  image_url: string
  prompt: string
  guidance_scale?: number
  output_format?: 'png' | 'jpeg'
}

// `fal-ai/flux-kontext-lora/inpaint` (Step 2 do Pipeline A)
// Mirror do `BaseKontextInpaintInput` (node_modules/@fal-ai/client/.../endpoints.d.ts)
type FluxKontextInpaintInput = {
  image_url: string
  mask_url: string
  reference_image_url: string
  prompt: string
  guidance_scale?: number
  num_inference_steps?: number
  output_format?: 'png' | 'jpeg'
  strength?: number
}

// ─── Outputs (todos retornam shape { images: [{url}] }) ────────

type FalImageRef = { url?: string }
type FluxKontextOutput = {
  images?: FalImageRef[]
  image?: FalImageRef
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
// Step 1 (capa neutra) + Pipeline B (Elástico, Detalhe Tecido)
// Endpoint: fal-ai/flux-pro/kontext
// ═══════════════════════════════════════════════════════════════

export type FluxKontextArgs = {
  imageBuffer?: Buffer
  imageUrl?: string
  prompt: string
}

export async function callFluxKontext(args: FluxKontextArgs): Promise<Buffer> {
  if (!args.imageBuffer && !args.imageUrl) {
    throw new Error('callFluxKontext: forneça imageBuffer ou imageUrl')
  }
  const imageInput: string = args.imageBuffer
    ? await uploadBuffer(args.imageBuffer)
    : (args.imageUrl as string)

  const input: FluxKontextInput = {
    image_url: imageInput,
    prompt: args.prompt,
    guidance_scale: 3.5,
    output_format: 'png',
  }

  const { data } = await fal.subscribe(brandM1.pipeline.falModels.fluxKontext, {
    input,
    logs: false,
  })

  const output: FluxKontextOutput = data
  const outputUrl = output.images?.[0]?.url ?? output.image?.url
  if (!outputUrl) throw new Error('Flux Kontext não retornou URL de saída')

  return downloadAsBuffer(outputUrl, 'output Flux Kontext')
}

// ═══════════════════════════════════════════════════════════════
// Step 2 (aplicar swatch no template via inpainting)
// Endpoint: fal-ai/flux-kontext-lora/inpaint
// Aceita image_url + mask_url + reference_image_url + prompt.
// ═══════════════════════════════════════════════════════════════

export type FluxKontextInpaintArgs = {
  imageBuffer: Buffer
  maskBuffer: Buffer
  referenceBuffer: Buffer
  prompt: string
  numInferenceSteps?: number
  strength?: number
}

export async function callFluxKontextInpaint(
  args: FluxKontextInpaintArgs
): Promise<Buffer> {
  const [imageUrl, maskUrl, referenceUrl] = await Promise.all([
    uploadBuffer(args.imageBuffer),
    uploadBuffer(args.maskBuffer),
    uploadBuffer(args.referenceBuffer),
  ])

  const input: FluxKontextInpaintInput = {
    image_url: imageUrl,
    mask_url: maskUrl,
    reference_image_url: referenceUrl,
    prompt: args.prompt,
    guidance_scale: 2.5,
    num_inference_steps: args.numInferenceSteps ?? 30,
    output_format: 'png',
    strength: args.strength ?? 0.88,
  }

  const { data } = await fal.subscribe(
    brandM1.pipeline.falModels.fluxKontextInpaint,
    { input, logs: false }
  )

  const output: FluxKontextOutput = data
  const outputUrl = output.images?.[0]?.url ?? output.image?.url
  if (!outputUrl) throw new Error('Flux Kontext Inpaint não retornou URL de saída')

  return downloadAsBuffer(outputUrl, 'output Flux Kontext Inpaint')
}

// ═══════════════════════════════════════════════════════════════
// Mask offline (script m1:generate-masks)
// Endpoint: fal-ai/grounded-sam-2
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
      text_prompt: args.textPrompt,
    },
    logs: false,
  })

  const output: GroundedSamOutput = data
  const maskUrl =
    output.masks?.[0]?.url ?? output.image?.url ?? output.images?.[0]?.url
  if (!maskUrl) throw new Error('Grounded-SAM não retornou mask')

  return downloadAsBuffer(maskUrl, 'mask Grounded-SAM')
}
