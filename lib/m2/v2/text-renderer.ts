/**
 * V2 Text Renderer — word-wrap simples + auto-shrink ±10%
 *
 * V2 simplifica vs T2: buckets char-count já decidiram o fontSize base.
 * Aqui só word-wrap + tentativa de shrink se overflow.
 */

export interface WrapTextArgs {
  text: string
  maxWidthPx: number
  fontSize: number
  fontWeight: number
  /** Limite vertical em px. Quando lines×fontSize×lineHeight > maxHeight, faz shrink. */
  maxHeightPx?: number
  /** Default 1.05 — Montserrat ExtraBold tight. */
  lineHeight?: number
  /** Limite mínimo de fontSize (shrink). Default 0.9 do fontSize. */
  minFontSize?: number
}

export interface WrapTextResult {
  lines: string[]
  fontSize: number
  shrunk: boolean
}

// Width factor Montserrat por weight (empírico — alinhado com T2).
function widthFactorFor(weight: number): number {
  if (weight >= 800) return 0.66
  if (weight >= 700) return 0.62
  if (weight >= 600) return 0.58
  return 0.54
}

function wrapByWords(text: string, maxWidthPx: number, charWidthPx: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const maxCharsPerLine = Math.max(1, Math.floor(maxWidthPx / charWidthPx))
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    if (!current) {
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

export function wrapText(args: WrapTextArgs): WrapTextResult {
  const lineHeight = args.lineHeight ?? 1.05
  const minFontSize = args.minFontSize ?? Math.round(args.fontSize * 0.9)
  let fontSize = args.fontSize
  let shrunk = false

  for (let attempt = 0; attempt < 3; attempt++) {
    const charW = fontSize * widthFactorFor(args.fontWeight)
    const lines = wrapByWords(args.text, args.maxWidthPx, charW)
    const totalH = lines.length * fontSize * lineHeight
    if (!args.maxHeightPx || totalH <= args.maxHeightPx) {
      return { lines, fontSize, shrunk }
    }
    if (fontSize <= minFontSize) {
      return { lines, fontSize, shrunk: true }
    }
    fontSize = Math.max(minFontSize, Math.round(fontSize * 0.95))
    shrunk = true
  }
  // Fallback final.
  const charW = fontSize * widthFactorFor(args.fontWeight)
  return { lines: wrapByWords(args.text, args.maxWidthPx, charW), fontSize, shrunk }
}
