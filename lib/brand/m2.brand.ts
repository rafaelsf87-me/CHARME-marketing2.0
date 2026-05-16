import { brandBase } from './base.config'

// Fonte única de verdade do M2 — Posts Instagram.
// Parâmetros de modelo IA (endpoint, tier, image_size, etc.) ficam no
// falConfig de cada template (lib/m2/templates/*/config.ts). Aqui ficam
// só constraints globais do módulo (dimensão final, faixa de carrossel,
// limite de PNGs de referência, fontes e cores que servem ao Pipeline
// Híbrido futuro do T2).
export const brandM2 = {
  ...brandBase,
  fonts: {
    title: 'Montserrat',
    body: 'Montserrat',
    cta: 'Montserrat',
  },
  textColors: {
    title: brandBase.colors.cta, // #4CDDC3 — referência visual; T1 não usa compositing
    body: brandBase.colors.white, // #FEFEFC
  },
  footer: {
    logo: brandBase.logo,
    handle: brandBase.socialHandle, // @charmedodetalhe
  },
  // 4 PNGs prontos em public/brand/m2/logos/. `casinha` é default (90% dos
  // casos); `retangular` omite handle text no footer-overlay (o próprio logo
  // já contém "Charme do Detalhe"). Ver Adendo §2 e §7.
  logos: {
    basePath: '/brand/m2/logos',
    files: {
      casinha: 'logo-casinha.png',
      quadrado: 'logo-quadrado.png',
      '3d': 'logo-3d.png',
      retangular: 'logo-retangular.png',
    },
    default: 'casinha' as const,
  },
  dimensions: {
    // 1080×1350 (4:5 portrait Instagram). Substitui 1080×1080 da SPEC ≤v1.5.
    final: { width: 1080, height: 1350 },
    // Output nativo do gpt-image-1 (antes do resize/crop).
    falNative: { width: 1024, height: 1536 },
  },
  pipeline: {
    // Modo upload (Adendo §3): 1-8 PNGs de referência. Modo IA: 0-8 opcionais.
    maxReferenceImages: 8,
    carouselSlidesRange: { min: 2, max: 8 },
  },
} as const

export type BrandM2 = typeof brandM2
