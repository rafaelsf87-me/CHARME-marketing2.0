import sharp from 'sharp'
import { callFluxAtriz, callRembg } from './fal-client'

// Pipeline da atriz pro M3 — DEC-M3-003.
// Modo IA: Flux Pro v1.1 Ultra (text-to-image) → rembg → PNG transparente.
// Modo Upload: detecta alpha real, faz rembg só se necessário.

// Prompt base em inglês — Flux entende melhor que pt-BR.
// v2 (2026-05-17): reforço explícito de idade (smoke v1 gerou 25-32 anos
// devido ao viés "younger by default" do Flux) + expressão mais animada
// olhando direto pra câmera ("oh how wonderful!" delight).
export function buildAtrizPrompt(detalhes?: string): string {
  const base = `Professional studio portrait photograph of a mature Brazilian woman in her late 30s to mid 40s, confident and warm appearance with subtle natural laugh lines around her eyes and mouth when smiling, friendly genuine smile showing teeth, hands gracefully placed near her chin in a charming gesture, wearing a simple plain white t-shirt, animated and expressive face conveying delightful surprise ('oh how wonderful!' feeling), looking directly at the camera engaging the viewer, soft natural studio lighting from the side, photorealistic style with realistic skin texture showing mature beauty, sharp focus on face, isolated subject on plain neutral gradient background, full body framing from waist up. The woman should look like a typical Brazilian mother in her 40s — not young, not aged, middle-aged with natural confidence.`
  const extras = detalhes?.trim()
  return extras ? `${base} ${extras}` : base
}

export interface GenerateAtrizArgs {
  modo: 'ia' | 'upload'
  detalhes?: string
  uploadBuffer?: Buffer
}

export interface GenerateAtrizResult {
  png: Buffer
  // 'flux+rembg' | 'upload-passthrough' | 'upload-rembg'
  source: 'flux+rembg' | 'upload-passthrough' | 'upload-rembg'
}

// Decide se um Buffer já tem alpha "real" (significativo) ou precisa de rembg.
// Critério: tem canal alpha + pelo menos um dos 4 cantos é totalmente transparente
// (alpha=0). Imagens com canal alpha mas todos os cantos opacos quase certamente
// têm fundo sólido falso (PNG salvo de JPG, etc.) → precisa rembg.
async function hasRealTransparency(buf: Buffer): Promise<boolean> {
  const img = sharp(buf)
  const meta = await img.metadata()
  if (!meta.hasAlpha) return false

  const w = meta.width ?? 0
  const h = meta.height ?? 0
  if (w < 2 || h < 2) return false

  // Extrai canal alpha em raw, amostra os 4 cantos.
  const alpha = await img.extractChannel('alpha').raw().toBuffer()
  const corners = [
    alpha[0], // TL
    alpha[w - 1], // TR
    alpha[(h - 1) * w], // BL
    alpha[h * w - 1], // BR
  ]
  return corners.some((a) => a === 0)
}

// Orquestrador da atriz. Retorna sempre PNG com alpha real pronto pra
// compose no banner.
export async function generateAtriz(args: GenerateAtrizArgs): Promise<GenerateAtrizResult> {
  if (args.modo === 'ia') {
    const prompt = buildAtrizPrompt(args.detalhes)
    const raw = await callFluxAtriz({ prompt })
    const png = await callRembg(raw)
    return { png, source: 'flux+rembg' }
  }

  if (!args.uploadBuffer) {
    throw new Error('[M3] generateAtriz modo=upload requer uploadBuffer')
  }

  const transparent = await hasRealTransparency(args.uploadBuffer)
  if (transparent) {
    return { png: args.uploadBuffer, source: 'upload-passthrough' }
  }

  const png = await callRembg(args.uploadBuffer)
  return { png, source: 'upload-rembg' }
}
