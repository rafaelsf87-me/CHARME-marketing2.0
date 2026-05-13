export const brandBase = {
  colors: {
    primaryDark: '#553679',
    primaryLight: '#9569C8',
    cta: '#4CDDC3',
    white: '#FEFEFC',
  },
  logo: '/brand/logo.svg',
  name: 'Charme do Detalhe',
  systemName: 'Marketing IA',
  socialHandle: '@charmedodetalhe',
} as const

export type BrandBase = typeof brandBase
