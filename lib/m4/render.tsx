import 'server-only'
import sharp from 'sharp'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { put } from '@vercel/blob'
import { brandM4 } from '@/lib/brand/m4.brand'
import { getTemplateDef } from './templates'
import { templateHas3Linhas, type M4RenderInput } from './schema'

// ─── Geometria fixa (Bloco C) ────────────────────────────────────────────────

const W = brandM4.dimensions.thumbnail.width // 1080
const H = brandM4.dimensions.thumbnail.height // 1920
const MARGIN_X = 80
const SAFE_W = W - MARGIN_X * 2 // 920

const BOX_PADDING_X = 32
const BOX_PADDING_Y = 16
const BOX_HEIGHT = 112 // 80 + 16*2
const BOX_RADIUS = 8
const BOX_GAP = 8

const FONT_SIZE = 80
const FONT_FAMILY = 'Tinos'

const FLORZINHA_SIZE = 80
const FLORZINHA_OFFSET = 15

const EMOJI_SIZE = 110
const EMOJI_GAP = 12

const ROTATION = brandM4.rotation // -2.5

// ─── Assets locais (carregados via fs no servidor) ───────────────────────────

const FONT_BOLD_PATH = path.join(process.cwd(), 'public', 'fonts', 'Tinos-Bold.ttf')
const FLORZINHA_PATH = path.join(process.cwd(), 'public', 'brand', 'florzinha.svg')

let fontDataCache: Buffer | null = null
let florzinhaDataUriCache: string | null = null

async function getFontData(): Promise<Buffer> {
  if (!fontDataCache) fontDataCache = await fs.readFile(FONT_BOLD_PATH)
  return fontDataCache
}

async function getFlorzinhaDataUri(): Promise<string> {
  if (!florzinhaDataUriCache) {
    const buf = await fs.readFile(FLORZINHA_PATH)
    florzinhaDataUriCache = `data:image/svg+xml;base64,${buf.toString('base64')}`
  }
  return florzinhaDataUriCache
}

// ─── Cache em memória de emojis remotos ──────────────────────────────────────
// Map<url, { dataUri, ts }> — TTL de 1h. Evita refetch a cada render.

type CacheEntry = { dataUri: string; ts: number }
const emojiCache = new Map<string, CacheEntry>()
const EMOJI_TTL_MS = 60 * 60 * 1000

async function getEmojiDataUri(url: string): Promise<string> {
  const cached = emojiCache.get(url)
  if (cached && Date.now() - cached.ts < EMOJI_TTL_MS) return cached.dataUri

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha ao baixar ícone (HTTP ${res.status})`)
  const buf = Buffer.from(await res.arrayBuffer())
  const mime = res.headers.get('content-type') || 'image/png'
  const dataUri = `data:${mime};base64,${buf.toString('base64')}`

  emojiCache.set(url, { dataUri, ts: Date.now() })
  return dataUri
}

// ─── Parser simples de customização (brilho/contraste) ───────────────────────

interface ParsedCustomization {
  brightness: number
  contrast: number
}

function parseCustomization(text?: string): ParsedCustomization {
  if (!text) return { brightness: 1, contrast: 1 }
  const t = text.toLowerCase()
  let brightness = 1
  let contrast = 1

  if (/(aumentar|mais|maior).{0,12}brilho|brilho.{0,12}(alto|forte|maior)/.test(t)) brightness = 1.15
  else if (/(diminuir|menos|reduzir|baixar).{0,12}brilho|brilho.{0,12}(baix[oa]|fraco|menor)/.test(t)) brightness = 0.85

  if (/(aumentar|mais|maior).{0,12}contraste|contraste.{0,12}(alto|forte|maior)/.test(t)) contrast = 1.2
  else if (/(diminuir|menos|reduzir|baixar).{0,12}contraste|contraste.{0,12}(baix[oa]|fraco|menor)/.test(t)) contrast = 0.85

  return { brightness, contrast }
}

// ─── Render principal ────────────────────────────────────────────────────────

export interface RenderResult {
  url: string
  durationMs: number
  width: number
  height: number
}

export async function renderM4Thumbnail(input: M4RenderInput): Promise<RenderResult> {
  const t0 = Date.now()
  const tpl = getTemplateDef(input.template)
  const has3 = templateHas3Linhas(input.template)

  // 1) Frame de fundo
  const frameRes = await fetch(input.frameBlobUrl)
  if (!frameRes.ok) throw new Error(`Falha ao baixar frame (HTTP ${frameRes.status})`)
  const frameBuf = Buffer.from(await frameRes.arrayBuffer())

  // 2) Sharp: resize/cover 1080x1920 + ajustes de brilho/contraste
  const { brightness, contrast } = parseCustomization(input.customization)
  let basePipeline = sharp(frameBuf).resize(W, H, { fit: 'cover', position: 'center' })
  if (brightness !== 1) basePipeline = basePipeline.modulate({ brightness })
  if (contrast !== 1) {
    const a = contrast
    const b = -(128 * (a - 1)) // pivot 128 (mid-gray)
    basePipeline = basePipeline.linear(a, b)
  }
  const framePng = await basePipeline.png().toBuffer()

  // 3) Overlay via Satori (caixas + florzinha + emoji, todos dentro do bloco rotacionado)
  const fontData = await getFontData()
  const florzinhaDataUri = await getFlorzinhaDataUri()

  let emojiDataUri: string | null = null
  if (input.iconUrl) {
    try {
      emojiDataUri = await getEmojiDataUri(input.iconUrl)
    } catch (err) {
      // Falha de fetch do emoji não bloqueia o render — apenas pula o ícone.
      console.warn('[M4] emoji fetch falhou, seguindo sem ícone:', err)
      emojiDataUri = null
    }
  }

  type Line = { text: string; bg: string; color: string; isLast: boolean }
  const lines: Line[] = [
    { text: input.line1, bg: brandM4.palette.box1, color: brandM4.palette.text1, isLast: false },
    { text: input.line2, bg: brandM4.palette.box2, color: brandM4.palette.text2, isLast: !has3 },
  ]
  if (has3 && input.line3) {
    lines.push({
      text: input.line3,
      bg: brandM4.palette.box3,
      color: brandM4.palette.text3,
      isLast: true,
    })
  }

  const totalBlockHeight = BOX_HEIGHT * lines.length + BOX_GAP * (lines.length - 1)
  const blockCenterY = (tpl.verticalAnchorPercent / 100) * H
  const blockTop = Math.round(blockCenterY - totalBlockHeight / 2)

  const tree: any = {
    type: 'div',
    props: {
      style: {
        position: 'relative',
        width: W,
        height: H,
        display: 'flex',
        background: 'transparent',
      },
      children: {
        type: 'div',
        props: {
          style: {
            position: 'absolute',
            top: blockTop,
            left: 0,
            width: W,
            height: totalBlockHeight,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: BOX_GAP,
            transform: `rotate(${ROTATION}deg)`,
            transformOrigin: '50% 50%',
          },
                  children: lines.map((line, idx) => {
            const isFirst = idx === 0
            const showEmoji = line.isLast && !!emojiDataUri
                      const boxChildren: any[] = [
              {
                type: 'span',
                props: { children: line.text },
              },
            ]
            if (showEmoji) {
              boxChildren.push({
                type: 'img',
                props: {
                  src: emojiDataUri,
                  width: EMOJI_SIZE,
                  height: EMOJI_SIZE,
                  style: {
                    marginLeft: EMOJI_GAP,
                    objectFit: 'contain',
                  },
                },
              })
            }
            if (isFirst) {
              boxChildren.push({
                type: 'img',
                props: {
                  src: florzinhaDataUri,
                  width: FLORZINHA_SIZE,
                  height: FLORZINHA_SIZE,
                  style: {
                    position: 'absolute',
                    right: -FLORZINHA_OFFSET,
                    top: -FLORZINHA_OFFSET,
                  },
                },
              })
            }
            return {
              type: 'div',
              props: {
                style: {
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  paddingTop: BOX_PADDING_Y,
                  paddingBottom: BOX_PADDING_Y,
                  paddingLeft: BOX_PADDING_X,
                  paddingRight: BOX_PADDING_X,
                  background: line.bg,
                  color: line.color,
                  borderRadius: BOX_RADIUS,
                  fontFamily: FONT_FAMILY,
                  fontSize: FONT_SIZE,
                  fontWeight: 700,
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  maxWidth: SAFE_W,
                  overflow: 'visible',
                },
                children: boxChildren,
              },
            }
          }),
        },
      },
    },
  }

  const svg = await satori(tree, {
    width: W,
    height: H,
    fonts: [
      {
        name: FONT_FAMILY,
        data: fontData,
        weight: 700,
        style: 'normal',
      },
    ],
  })

  // 4) SVG → PNG (overlay com fundo transparente)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    background: 'rgba(0,0,0,0)',
    font: { loadSystemFonts: false },
  })
  const overlayPng = resvg.render().asPng()

  // 5) Composite: frame + overlay
  const finalBuf = await sharp(framePng)
    .composite([{ input: overlayPng, top: 0, left: 0 }])
    .png()
    .toBuffer()

  // 6) Validação rápida das dimensões finais
  const meta = await sharp(finalBuf).metadata()
  if (meta.width !== W || meta.height !== H || meta.format !== 'png') {
    throw new Error(`Output inválido: ${meta.width}x${meta.height} ${meta.format}`)
  }

  // 7) Upload pro Vercel Blob
  const filename = `m4-thumbnails/m4-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
  const blob = await put(filename, finalBuf, {
    access: 'public',
    contentType: 'image/png',
  })

  const durationMs = Date.now() - t0
  console.log(`[M4] render OK em ${durationMs}ms · ${filename}`)
  return { url: blob.url, durationMs, width: W, height: H }
}
