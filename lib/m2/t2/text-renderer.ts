/**
 * T2 Text Renderer — auto-fit determinístico
 *
 * Satori não expõe `measureText` nativamente. Strategy pragmática (alinhada
 * ao M3 que também usa fontSize fixo após teste):
 *
 *   - Estima largura média por caractere = fontSize × widthFactor
 *     (Montserrat ExtraBold ≈ 0.58, SemiBold ≈ 0.55, Regular ≈ 0.50)
 *   - Word-wrap por palavras inteiras, calcula nº de linhas
 *   - Aceita se (lines × fontSize × lineHeight) ≤ box.h
 *   - Binary search no fontSize entre [fontSizeMin, fontSizeMax]
 *
 * Heurística é conservadora — fontSize final tende a ser ~5% menor que o
 * "exato" mas evita overflow visual.
 */

import type { Rect } from './types'

export type TextOverflowStrategy = 'shrink' | 'truncate-ellipsis' | 'error'

export interface FitTextArgs {
  text: string
  box: Rect
  fontWeight: 400 | 500 | 600 | 700 | 800
  fontSizeMin: number
  fontSizeMax: number
  lineHeight: number
  /** Default: 4. Estoura warning se precisar mais que isso. */
  maxLines?: number
  overflowStrategy?: TextOverflowStrategy
}

export interface FitTextResult {
  fontSize: number
  lines: string[]
  /** True se overflowStrategy=shrink chegou em fontSizeMin e ainda não coube. */
  overflow: boolean
  /** Texto efetivamente renderizado (pode ter '...' truncado). */
  renderedText: string
}

// Width factor empírico do Montserrat por weight (conservador — superestima
// pra evitar overflow no Satori real, que tende a quebrar mais cedo que o
// cálculo otimista). ExtraBold uppercase em pt-BR ~0.66.
function widthFactorFor(weight: 400 | 500 | 600 | 700 | 800): number {
  if (weight >= 800) return 0.66
  if (weight >= 700) return 0.62
  if (weight >= 600) return 0.58
  return 0.52
}

function wrapText(text: string, maxWidthPx: number, charWidthPx: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']

  const maxCharsPerLine = Math.max(1, Math.floor(maxWidthPx / charWidthPx))
  const lines: string[] = []
  let current = ''

  for (const w of words) {
    if (!current) {
      // Palavra única que excede a linha → quebra forçada.
      if (w.length > maxCharsPerLine) {
        for (let i = 0; i < w.length; i += maxCharsPerLine) {
          lines.push(w.slice(i, i + maxCharsPerLine))
        }
        current = ''
        continue
      }
      current = w
      continue
    }
    const candidate = `${current} ${w}`
    if (candidate.length > maxCharsPerLine) {
      lines.push(current)
      current = w
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

function fitsAt(
  text: string,
  fontSize: number,
  args: FitTextArgs,
): { ok: boolean; lines: string[] } {
  const charW = fontSize * widthFactorFor(args.fontWeight)
  const lines = wrapText(text, args.box.w, charW)
  const totalH = lines.length * fontSize * args.lineHeight
  const maxLines = args.maxLines ?? 4
  const ok = totalH <= args.box.h && lines.length <= maxLines
  return { ok, lines }
}

function truncateWithEllipsis(text: string, fontSize: number, args: FitTextArgs): { lines: string[] } {
  const charW = fontSize * widthFactorFor(args.fontWeight)
  const lines = wrapText(text, args.box.w, charW)
  const maxLines = args.maxLines ?? 4
  if (lines.length <= maxLines) return { lines }
  const kept = lines.slice(0, maxLines)
  const last = kept[kept.length - 1]
  kept[kept.length - 1] = `${last.replace(/[\s.]+$/, '')}…`
  return { lines: kept }
}

export function fitTextToBox(args: FitTextArgs): FitTextResult {
  const strategy = args.overflowStrategy ?? 'shrink'

  // Binary search no fontSize.
  let lo = args.fontSizeMin
  let hi = args.fontSizeMax
  let bestFit: { fontSize: number; lines: string[] } | null = null

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const { ok, lines } = fitsAt(args.text, mid, args)
    if (ok) {
      bestFit = { fontSize: mid, lines }
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  if (bestFit) {
    return {
      fontSize: bestFit.fontSize,
      lines: bestFit.lines,
      overflow: false,
      renderedText: args.text,
    }
  }

  // Não coube nem no mínimo. Aplica strategy.
  if (strategy === 'error') {
    throw new Error(
      `[T2] text-renderer: texto não coube em fontSize ${args.fontSizeMin} no box ${args.box.w}×${args.box.h} (strategy=error)`,
    )
  }

  if (strategy === 'truncate-ellipsis') {
    const { lines } = truncateWithEllipsis(args.text, args.fontSizeMin, args)
    return {
      fontSize: args.fontSizeMin,
      lines,
      overflow: false,
      renderedText: lines.join(' '),
    }
  }

  // strategy === 'shrink' → entrega no mínimo com overflow=true
  const { lines } = fitsAt(args.text, args.fontSizeMin, args)
  return {
    fontSize: args.fontSizeMin,
    lines,
    overflow: true,
    renderedText: args.text,
  }
}
