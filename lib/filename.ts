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
  /**
   * Quando `true`, pula `slugifyKeyword` sobre `keyword` (apenas valida
   * fallback). Use quando `keyword` veio do API já normalizada via
   * `autoExtractKeyword` ou `slugifyKeyword` no servidor — slugificar de
   * novo destruiria formatos especiais como `'cor-ff5733'` do M1 Lisa.
   */
  keywordPreNormalized?: boolean
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
  const keyword = opts.keywordPreNormalized
    ? opts.keyword && opts.keyword.length > 0
      ? opts.keyword
      : KEYWORD_FALLBACK
    : slugifyKeyword(opts.keyword)
  const monthYear = mesAno(date)
  return `img-${modulo}-${fragment}-${keyword}-${monthYear}.${opts.extension}`
}

// ─── autoExtractKeyword (hotfix 19/05/2026) ────────────────────────────────
//
// Substitui o campo "Palavra-chave do arquivo" antes presente no UI dos 4
// módulos. APIs preenchem `normalizedKeyword` automaticamente quando o body
// não traz `keyword` explícito. Hierarquia por módulo segue briefing executivo.
// Schema do body continua aceitando `keyword?: string` opcional (retro-compat).

export type AutoExtractOpts =
  | {
      kind: 'm1'
      tipoCapa: 'lisa' | 'estampada' | 'alto-relevo'
      corHex?: string | null
      /** URL do upload da foto-referência (sofá-padrão com a estampa). */
      fotoEstampaUrl?: string | null
    }
  | {
      kind: 'm2'
      modo: 'imagem-unica' | 'carrossel'
      contextoGeral?: string | null
      firstSlideCopyTexto?: string | null
    }
  | { kind: 'm3'; nomePromocao?: string | null }
  | { kind: 'm4'; line1?: string | null }

/**
 * Extrai keyword do nome do arquivo de uma URL (Vercel Blob ou similar):
 *  - tira pathname e extensão
 *  - tira prefixos numéricos tipo `1234567890-` (timestamps comuns no Blob)
 *  - aplica slugifyKeyword no que sobrou (primeira palavra slug, max 20)
 *
 * Retorna string vazia se nada utilizável for encontrado.
 */
function extractFilenameKeyword(url: string): string {
  try {
    const u = new URL(url)
    let last = u.pathname.split('/').filter(Boolean).pop() ?? ''
    last = last.replace(/\.[a-z0-9]+$/i, '') // strip extensão
    last = last.replace(/^[0-9]+[-_]?/, '') // strip timestamp prefix
    if (!last) return ''
    const slug = slugifyKeyword(last)
    return slug === KEYWORD_FALLBACK ? '' : slug
  } catch {
    return ''
  }
}

function trySlug(input: string | null | undefined): string {
  if (!input) return ''
  const slug = slugifyKeyword(input)
  return slug === KEYWORD_FALLBACK ? '' : slug
}

/**
 * Retorna keyword **já normalizada e pronta pra concatenar no filename**
 * (não chamar `slugifyKeyword` em cima do resultado — alguns casos preservam
 * hífens propositalmente, ex: M1 Lisa `'cor-ff5733'`).
 */
export function autoExtractKeyword(opts: AutoExtractOpts): string {
  switch (opts.kind) {
    case 'm1': {
      if (opts.tipoCapa === 'lisa' && opts.corHex) {
        const hex = opts.corHex.replace('#', '').toLowerCase().slice(0, 6)
        if (hex) return `cor-${hex}`
      }
      if (opts.fotoEstampaUrl) {
        const fromFile = extractFilenameKeyword(opts.fotoEstampaUrl)
        if (fromFile) return fromFile
        return 'estampa'
      }
      return 'foto'
    }
    case 'm2': {
      const fromContexto = trySlug(opts.contextoGeral)
      if (fromContexto) return fromContexto
      const fromCopy = trySlug(opts.firstSlideCopyTexto)
      if (fromCopy) return fromCopy
      return opts.modo === 'carrossel' ? 'carrossel' : 'post'
    }
    case 'm3': {
      const fromNome = trySlug(opts.nomePromocao)
      if (fromNome) return fromNome
      return 'banner'
    }
    case 'm4': {
      const fromLine1 = trySlug(opts.line1)
      if (fromLine1) return fromLine1
      return 'thumb'
    }
  }
}
