/**
 * Padrão de nome de arquivo de download (DEC-M2-012).
 *
 * Formato:
 *   img-{modulo}-{slide}-{keyword}-{mes}{ano}.{ext}
 *
 * Exemplos:
 *   img-m2-slide3-bucha-mai26.png
 *   img-m3-desktop-descontao-mai26.webp
 *   img-m1-capa-floral-jun26.png
 *   img-m4-thumb-novidade-mai26.png
 *
 * Fase 4 (T2): utility criada e usada apenas no T2.
 * Fase 4.5 (retrofit): aplicar em M1/M2T1/M3/M4 separadamente.
 */

export type ModuloId = 'm1' | 'm2' | 'm3' | 'm4'

export type SlideKind =
  | { kind: 'm1'; tipoFoto: 'capa' | 'ambiente' | 'elastico' | 'detalhe-tecido' | 'vestindo-capa' }
  | { kind: 'm2'; variant: 'imagem-unica' | `slide${number}` }
  | { kind: 'm3'; formato: 'desktop' | 'mobile' }
  | { kind: 'm4' }

export interface BuildFilenameOpts {
  slide: SlideKind
  keyword: string | null | undefined
  extension: 'png' | 'webp' | 'jpg'
  date?: Date
}

const MESES_PT_BR = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const

const KEYWORD_FALLBACK = 'sem-tema'
const KEYWORD_MAX_LEN = 20

/**
 * Slugifica keyword:
 *  - NFD + strip diacríticos
 *  - lowercase
 *  - remove caracteres não `[a-z0-9\s-]`
 *  - pega primeira palavra (split por espaço ou hífen)
 *  - max 20 chars
 *  - fallback 'sem-tema' se vazio
 */
export function slugifyKeyword(raw: string | null | undefined): string {
  if (!raw) return KEYWORD_FALLBACK
  const normalized = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacriticals
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
  if (!normalized) return KEYWORD_FALLBACK
  const firstWord = normalized.split(/[\s-]+/).filter(Boolean)[0] ?? ''
  const truncated = firstWord.slice(0, KEYWORD_MAX_LEN)
  return truncated || KEYWORD_FALLBACK
}

function slideFragment(slide: SlideKind): string {
  switch (slide.kind) {
    case 'm1': {
      // Encurtamentos pra nomes mais legíveis (DEC-M2-012).
      if (slide.tipoFoto === 'detalhe-tecido') return 'detalhe'
      if (slide.tipoFoto === 'vestindo-capa') return 'vestindo'
      return slide.tipoFoto
    }
    case 'm2':
      return slide.variant
    case 'm3':
      return slide.formato
    case 'm4':
      return 'thumb'
  }
}

function moduleId(slide: SlideKind): ModuloId {
  return slide.kind
}

function mesAno(date: Date): string {
  const mes = MESES_PT_BR[date.getMonth()]
  const ano = String(date.getFullYear() % 100).padStart(2, '0')
  return `${mes}${ano}`
}

export function buildDownloadFilename(opts: BuildFilenameOpts): string {
  const date = opts.date ?? new Date()
  const modulo = moduleId(opts.slide)
  const fragment = slideFragment(opts.slide)
  const keyword = slugifyKeyword(opts.keyword)
  const monthYear = mesAno(date)
  return `img-${modulo}-${fragment}-${keyword}-${monthYear}.${opts.extension}`
}
