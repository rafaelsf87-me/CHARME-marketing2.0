export const brandBase = {
  colors: {
    primaryDark: '#553679',
    primaryLight: '#9569C8',
    cta: '#4CDDC3',
    white: '#FEFEFC',
  },
  logo: '/brand/logo.svg',
  logoSquare: '/brand/m2/logos/logo-quadrado.png',
  name: 'Charme do Detalhe',
  systemName: 'Central Marketing - Charme do Detalhe',
  socialHandle: '@charmedodetalhe',
} as const

export type BrandBase = typeof brandBase
