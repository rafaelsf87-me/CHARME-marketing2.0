import { brandBase } from './base.config'

// M3 Banners Website — composição via GPT Image 2. Cores variam por template
// e por cor-tema da campanha (sem paleta fixa). Fonte: Montserrat.
// Dimensões fechadas em DEC-001 (15/05/2026).
export const brandM3 = {
  ...brandBase,
  fonts: {
    text: 'Montserrat, system-ui, sans-serif',
    family: 'Montserrat',
  },
  dimensions: {
    desktop: { width: 1920, height: 550 }, // ~3.49:1
    mobile: { width: 800, height: 600 }, // 4:3
  },
} as const

export type BrandM3 = typeof brandM3
