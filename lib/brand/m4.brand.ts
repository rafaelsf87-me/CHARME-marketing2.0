import { brandBase } from './base.config'

export const brandM4 = {
  ...brandBase,
  fonts: {
    // Tinos: clone métrico open-source do Times (Apache 2.0). Self-hosted em
    // public/fonts/Tinos-{Regular,Bold}.ttf. DEC-003 resolvida.
    text: 'Tinos, "Times New Roman", serif',
    family: 'Tinos',
  },
  palette: {
    box1: brandBase.colors.white,
    box2: brandBase.colors.primaryDark,
    box3: brandBase.colors.cta,
    text1: '#1A1A1A',
    text2: brandBase.colors.white,
    text3: '#1A1A1A',
  },
  dimensions: {
    thumbnail: { width: 1080, height: 1920 },
  },
  rotation: -2.5,
  limits: {
    line1MaxChars: 24,
    line2MaxChars: 22,
    line3MaxChars: 18,
  },
} as const

export type BrandM4 = typeof brandM4
