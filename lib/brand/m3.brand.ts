import { brandBase } from './base.config'

// M3 Banners Website — Pipeline Híbrido (v1.0).
// Sharp/Satori controla 100% do layout, BG, tipografia descritiva, card de
// condições e footer. IA restrita a 2 elementos isolados: título 3D balão
// (gpt-image-1 high) e atriz cutout (Flux + rembg). Decorações vêm de banco
// curado (Microsoft Fluent Emoji 3D). Ver DEC-M3-001 em DIVIDAS_PROJETO.md.
//
// Dimensões: DEC-001 (15/05/2026). Cores paramétricas: defaults pra T1
// Atual_Maio26, sobrescritas por color picker do user.
export const brandM3 = {
  ...brandBase,
  dimensions: {
    desktop: { width: 1920, height: 550 }, // ~3.49:1
    mobile: { width: 800, height: 600 }, // 4:3
  },
  output: {
    format: 'webp' as const,
    quality: 90,
  },
  fonts: {
    primary: 'Montserrat',
    weights: [600, 700, 800] as const,
  },
  defaultColors: {
    primary: '#E91E63',
    secondary: '#C2185B',
    accent: '#7A1640',
    cardBg: '#FFEAF1',
    cardBgEnd: '#FDD6E5',
  },
  decoracoes: {
    bancoDir: '/brand/m3/decoracoes/',
    defaults: ['coracao-rosa', 'coracao-vermelho', 'coracao-balao', 'foguete'] as const,
  },
} as const

export type BrandM3 = typeof brandM3
