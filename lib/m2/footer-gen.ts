import path from 'node:path'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { brandM2 } from '@/lib/brand/m2.brand'
import type { M2LogoOption } from './schema'

// Used by Pipeline Híbrido (T2/T3). Not active in T1 (Atual_Maio26).
//
// Footer-overlay programático: gera faixa transparente (logo + @charmedodetalhe)
// pra Sharp composite no canto inferior do canvas final.
//
// Decisão Rafael pós-smoke 2: T1 não usa footer overlay (gpt-image-1 não
// respeitou pixel-precisamente "BOTTOM 180px MUST BE EMPTY", body text
// invadia a zona reservada). Footer fica reservado pro T2/T3 que terão
// composição via Sharp/Satori com controle pixel-preciso (Fase 3).
//
// Layout default: [logo] [gap 16px] [@charmedodetalhe 28px Montserrat 600 #FEFEFC]
// Layout retangular: só [logo-retangular] (o próprio logo já contém o nome).

interface FooterArgs {
  logoOption: M2LogoOption
  /** Largura do canvas final (default 1080) */
  canvasWidth?: number
}

const FOOTER_HEIGHT = 120
const LOGO_TARGET_HEIGHT_DEFAULT = 60
const LOGO_TARGET_HEIGHT_RETANGULAR = 52
const TEXT_FONT_SIZE = 28
const HANDLE = '@charmedodetalhe'
const HANDLE_TEXT_WIDTH = 280 // aproximação visual pro layout do SVG
const GAP = 16
const MARGIN_BOTTOM = 40

export async function generateFooterOverlay(args: FooterArgs): Promise<Buffer> {
  const { logoOption, canvasWidth = 1080 } = args
  const showHandleText = logoOption !== 'retangular'
  const logoHeight =
    logoOption === 'retangular' ? LOGO_TARGET_HEIGHT_RETANGULAR : LOGO_TARGET_HEIGHT_DEFAULT

  const logoFile = brandM2.logos.files[logoOption]
  const logoPath = path.join(process.cwd(), 'public', brandM2.logos.basePath, logoFile)
  const logoBuffer = readFileSync(logoPath)

  // Resize logo pra altura alvo preservando proporção (fit:'inside' = letterbox interno).
  const logoResized = await sharp(logoBuffer)
    .resize({ height: logoHeight, fit: 'inside' })
    .png()
    .toBuffer()
  const logoMeta = await sharp(logoResized).metadata()
  const logoWidth = logoMeta.width ?? logoHeight

  let totalContentWidth: number
  let handleBuffer: Buffer | null = null

  if (showHandleText) {
    const handleSvg = `
      <svg width="${HANDLE_TEXT_WIDTH}" height="${logoHeight}" xmlns="http://www.w3.org/2000/svg">
        <style>
          text { font-family: 'Montserrat', 'Helvetica', sans-serif; font-weight: 600; }
        </style>
        <text x="0" y="${logoHeight / 2}" dominant-baseline="middle" font-size="${TEXT_FONT_SIZE}" fill="#FEFEFC">${HANDLE}</text>
      </svg>
    `
    handleBuffer = await sharp(Buffer.from(handleSvg)).png().toBuffer()
    totalContentWidth = logoWidth + GAP + HANDLE_TEXT_WIDTH
  } else {
    totalContentWidth = logoWidth
  }

  const startX = Math.floor((canvasWidth - totalContentWidth) / 2)
  const verticalOffset = Math.floor((FOOTER_HEIGHT - logoHeight) / 2)

  const composites: sharp.OverlayOptions[] = [
    { input: logoResized, top: verticalOffset, left: startX },
  ]
  if (handleBuffer) {
    composites.push({
      input: handleBuffer,
      top: verticalOffset,
      left: startX + logoWidth + GAP,
    })
  }

  // Canvas transparente do tamanho da faixa-footer.
  return sharp({
    create: {
      width: canvasWidth,
      height: FOOTER_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer()
}

export const FOOTER_RESERVED_HEIGHT = FOOTER_HEIGHT
export const FOOTER_MARGIN_BOTTOM = MARGIN_BOTTOM
