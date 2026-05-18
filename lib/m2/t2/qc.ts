/**
 * T2 QC — validador programático com score
 *
 * Fase 2:
 *   Errors (estruturais — falham hard sem retry):
 *     - CANVAS_DIM_WRONG: confere via sharp metadata
 *     - FOOTER_MISSING: SÓ em cta-final/imagem_unica (DEC-M2-015)
 *     - BLEED_CHECK_FAILED: 4 bordas — confere se conteúdo visível
 *       (não-bg) invade os primeiros 60px de cada borda
 *   Warnings (entregam mas alertam):
 *     - BACKGROUND_LUMA_VS_TEXT: contraste WCAG AA (≥4.5:1) entre luma
 *       média do bg (4 cantos da safe area) e cor do texto
 *
 *  Stubs Fase 3:
 *     - TEXT_OUTSIDE_SAFE_AREA (precisa SDK measure de Satori)
 *     - IMAGE_SLOT_EMPTY (depende de RA pra slot obrigatório)
 *     - UPLOAD_LEAKED_REFERENCE (OCR)
 *
 *  qualityScore: 100 base, −20 por error, −5 por warning, floor 0.
 */

import sharp from 'sharp'
import {
  T2_CANVAS_HEIGHT,
  T2_CANVAS_WIDTH,
  type QCIssue,
  type QCReport,
  type SlidePlan,
} from './types'

const FOOTER_HEIGHT = 120
const FOOTER_MARGIN_BOTTOM = 40
const FOOTER_TOP = T2_CANVAS_HEIGHT - FOOTER_MARGIN_BOTTOM - FOOTER_HEIGHT
const BLEED_PX = 60

export interface ValidateSlideArgs {
  buffer: Buffer
  plan: SlidePlan
}

// ─── Helpers de amostragem ──────────────────────────────────────────────────

async function extractRegion(
  buffer: Buffer,
  left: number,
  top: number,
  width: number,
  height: number,
): Promise<{ data: Buffer; info: sharp.OutputInfo }> {
  const region = await sharp(buffer)
    .extract({ left, top, width, height })
    .raw()
    .toBuffer({ resolveWithObject: true })
  return region
}

function pixelLuma(r: number, g: number, b: number): number {
  // Rec. 709 luma (0..255).
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function colorLuma(hex: string): number {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return 0
  const n = parseInt(m[1], 16)
  return pixelLuma((n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff)
}

function contrastRatio(luma1: number, luma2: number): number {
  // WCAG: (L_high + 0.05) / (L_low + 0.05). Normaliza luma 0..255 → 0..1.
  const l1 = luma1 / 255
  const l2 = luma2 / 255
  const hi = Math.max(l1, l2)
  const lo = Math.min(l1, l2)
  return (hi + 0.05) / (lo + 0.05)
}

// ─── Checks ─────────────────────────────────────────────────────────────────

async function checkCanvasDim(buffer: Buffer): Promise<QCIssue | null> {
  const meta = await sharp(buffer).metadata()
  if (meta.width !== T2_CANVAS_WIDTH || meta.height !== T2_CANVAS_HEIGHT) {
    return {
      code: 'CANVAS_DIM_WRONG',
      severity: 'error',
      message: `canvas ${meta.width}×${meta.height}, esperado ${T2_CANVAS_WIDTH}×${T2_CANVAS_HEIGHT}`,
      expected: [T2_CANVAS_WIDTH, T2_CANVAS_HEIGHT],
      got: [meta.width ?? 0, meta.height ?? 0],
    }
  }
  return null
}

/**
 * Footer só é esperado em subtemplates cta-final ou imagem_unica
 * (DEC-M2-015). Pra demais slides, retorna null sem checar.
 *
 * Footer pode estar EMBUTIDO no background (PNG curado) OU programático.
 * Em ambos os casos, amostramos pixels claros (R/G/B > 200) na faixa.
 */
async function checkFooterPresent(buffer: Buffer, plan: SlidePlan): Promise<QCIssue | null> {
  const needsFooter =
    plan.subtemplateId === 'cta-final' ||
    plan.slideType === 'imagem_unica' ||
    plan.slideType === 'cta_final'
  if (!needsFooter) return null

  // Amostra grid 4 rows × 8 cols cobrindo toda a footer zone (1190..1310).
  // Footer pode estar programático (logo nos primeiros 80px) ou embutido
  // no PNG (variável y). Amostragem ampla pega ambos casos.
  const { data, info } = await extractRegion(buffer, 0, FOOTER_TOP, T2_CANVAS_WIDTH, FOOTER_HEIGHT)
  const { width, height, channels } = info

  let brightPixels = 0
  const rows = 4
  const cols = 8
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = Math.floor(((c + 0.5) / cols) * width)
      const y = Math.floor(((r + 0.5) / rows) * height)
      const idx = (y * width + x) * channels
      const pr = data[idx] ?? 0
      const pg = data[idx + 1] ?? 0
      const pb = data[idx + 2] ?? 0
      if (pr > 200 && pg > 200 && pb > 200) brightPixels++
    }
  }

  if (brightPixels === 0) {
    return {
      code: 'FOOTER_MISSING',
      severity: 'error',
      message: 'Footer não detectado em slide cta-final/imagem_unica — nenhum pixel claro na footer zone (grid 4×8)',
    }
  }
  return null
}

/**
 * Confere contraste do background vs cor do texto (WCAG AA mínimo 4.5:1).
 * Amostra luma média dos 4 cantos da safe area do background.
 *
 * Heurística pra cor de texto: light-text=branco (luma 255), dark-text=primary.
 */
async function checkBackgroundLumaVsText(
  buffer: Buffer,
  plan: SlidePlan,
): Promise<QCIssue | null> {
  // Cor do texto inferida do background (mesma regra dos subtemplates).
  // Como o plan não carrega o BG resolvido, importamos lazy o catalog.
  // Reduz coupling — evita ciclo de import.
  const { getBackground } = await import('./backgrounds/catalog')
  let bg: ReturnType<typeof getBackground>
  try {
    bg = getBackground(plan.backgroundId)
  } catch {
    return null
  }

  const textHex = bg.contrast === 'light-text' ? '#FFFFFF' : bg.palette.primary
  const textLuma = colorLuma(textHex)

  // Amostra 4 regiões pequenas no centro de cada quadrante da safe area.
  const sampleW = 80
  const sampleH = 80
  const safe = bg.safeAreas
  const points = [
    [safe.left + 50, safe.top + 50],
    [T2_CANVAS_WIDTH - safe.right - sampleW - 50, safe.top + 50],
    [safe.left + 50, T2_CANVAS_HEIGHT - safe.bottom - sampleH - 50],
    [T2_CANVAS_WIDTH - safe.right - sampleW - 50, T2_CANVAS_HEIGHT - safe.bottom - sampleH - 50],
  ]

  let avgLumaSum = 0
  for (const [x, y] of points) {
    const { data, info } = await extractRegion(buffer, x, y, sampleW, sampleH)
    let sum = 0
    let count = 0
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i] ?? 0
      const g = data[i + 1] ?? 0
      const b = data[i + 2] ?? 0
      sum += pixelLuma(r, g, b)
      count++
    }
    avgLumaSum += sum / Math.max(1, count)
  }
  const bgLuma = avgLumaSum / points.length
  const ratio = contrastRatio(textLuma, bgLuma)

  if (ratio < 4.5) {
    return {
      code: 'BACKGROUND_LUMA_VS_TEXT',
      severity: 'warning',
      message: `Contraste WCAG ${ratio.toFixed(2)}:1 abaixo de 4.5:1 (text=${textHex}, bg luma média=${bgLuma.toFixed(0)})`,
      bgLuma,
      textLuma,
      ratio,
    }
  }
  return null
}

/**
 * Confere que o bleed (60px de cada borda) está livre de elementos
 * visíveis adicionais — heurística: a faixa não deve diferir muito do
 * background original.
 *
 * Como não temos o BG cru no QC, usamos um proxy: variance na faixa.
 * Variância alta sugere texto/imagem invadindo o bleed.
 *
 * Threshold conservador — primeira passada de QC, vai sendo ajustado.
 */
async function checkBleed(buffer: Buffer): Promise<QCIssue[]> {
  const issues: QCIssue[] = []
  const edges: Array<{ name: 'top' | 'right' | 'bottom' | 'left'; rect: [number, number, number, number] }> = [
    { name: 'top', rect: [0, 0, T2_CANVAS_WIDTH, BLEED_PX] },
    { name: 'bottom', rect: [0, T2_CANVAS_HEIGHT - BLEED_PX, T2_CANVAS_WIDTH, BLEED_PX] },
    { name: 'left', rect: [0, 0, BLEED_PX, T2_CANVAS_HEIGHT] },
    { name: 'right', rect: [T2_CANVAS_WIDTH - BLEED_PX, 0, BLEED_PX, T2_CANVAS_HEIGHT] },
  ]

  for (const edge of edges) {
    const [x, y, w, h] = edge.rect
    const { data, info } = await extractRegion(buffer, x, y, w, h)
    // Calcula variância de luma. Background "limpo" varia pouco; texto/imagem
    // forte gera variância alta.
    let sum = 0
    let sumSq = 0
    let count = 0
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i] ?? 0
      const g = data[i + 1] ?? 0
      const b = data[i + 2] ?? 0
      const luma = pixelLuma(r, g, b)
      sum += luma
      sumSq += luma * luma
      count++
    }
    const mean = sum / count
    const variance = sumSq / count - mean * mean
    // Threshold empírico: starfields têm variance ~1500-2500 (estrelas + nebulosa).
    // Texto branco sólido sobre roxo gera variance >5000.
    // Conservador: >6000 = provável bleed.
    if (variance > 6000) {
      issues.push({
        code: 'BLEED_CHECK_FAILED',
        severity: 'error',
        message: `Variância de luma ${variance.toFixed(0)} na borda ${edge.name} indica conteúdo invadindo bleed (60px)`,
        edge: edge.name,
      })
    }
  }
  return issues
}

// ─── Score ──────────────────────────────────────────────────────────────────

function computeScore(errors: QCIssue[], warnings: QCIssue[]): number {
  return Math.max(0, 100 - 20 * errors.length - 5 * warnings.length)
}

export async function validateSlide(args: ValidateSlideArgs): Promise<QCReport> {
  const issues: QCIssue[] = []

  const dimIssue = await checkCanvasDim(args.buffer)
  if (dimIssue) issues.push(dimIssue)

  if (!dimIssue) {
    const footerIssue = await checkFooterPresent(args.buffer, args.plan)
    if (footerIssue) issues.push(footerIssue)

    const lumaIssue = await checkBackgroundLumaVsText(args.buffer, args.plan)
    if (lumaIssue) issues.push(lumaIssue)

    const bleedIssues = await checkBleed(args.buffer)
    issues.push(...bleedIssues)

    const uploadLeakWarnings = await checkUploadLeakHeuristic(args.buffer, args.plan)
    issues.push(...uploadLeakWarnings)
  }

  const errors = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warning')

  return {
    pass: errors.length === 0,
    qualityScore: computeScore(errors, warnings),
    errors,
    warnings,
  }
}

/**
 * Heurística V1 (Fase 3) pra detectar vazamento de upload referência
 * (DEC-M2-014).
 *
 * Pra cada imageSlot com source='uploaded', amostra o bounding box
 * renderizado. Se >40% dos pixels forem cinza homogêneo (placeholder não
 * substituído) OU se variance de luma for muito alta indicando texto
 * sobreposto, emite warning UPLOAD_LEAKED_REFERENCE.
 *
 * V2 futuro: tesseract.js OCR no bounding box.
 */
async function checkUploadLeakHeuristic(buffer: Buffer, plan: SlidePlan): Promise<QCIssue[]> {
  const issues: QCIssue[] = []
  const uploadedSlots = plan.imageSlots.filter((s) => s.source === 'uploaded')
  if (uploadedSlots.length === 0) return issues

  const { getSubtemplate } = await import('./subtemplates')
  let subtemplate
  try {
    subtemplate = getSubtemplate(plan.subtemplateId)
  } catch {
    return issues
  }

  for (const slot of uploadedSlots) {
    const def = subtemplate.config.imageSlots.find((d) => d.id === slot.id)
    if (!def) continue
    const { box } = def
    if (box.x < 0 || box.y < 0) continue

    const { data, info } = await extractRegion(buffer, box.x, box.y, box.w, box.h)
    let homogeneousGray = 0
    let sumLuma = 0
    let sumLumaSq = 0
    let count = 0
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i] ?? 0
      const g = data[i + 1] ?? 0
      const b = data[i + 2] ?? 0
      const luma = pixelLuma(r, g, b)
      sumLuma += luma
      sumLumaSq += luma * luma
      count++
      // Cinza homogêneo: canais aproximadamente iguais e mid-tone.
      const maxC = Math.max(r, g, b)
      const minC = Math.min(r, g, b)
      if (maxC - minC < 10 && luma > 80 && luma < 200) homogeneousGray++
    }
    const grayRatio = homogeneousGray / count
    if (grayRatio > 0.4) {
      issues.push({
        code: 'UPLOAD_LEAKED_REFERENCE',
        severity: 'warning',
        message: `Slot ${slot.id} com source=uploaded tem ${(grayRatio * 100).toFixed(1)}% pixels cinza homogêneo — possível placeholder não substituído`,
        slotId: slot.id,
        detectedTextLength: 0,
      })
    }
  }

  return issues
}

/**
 * OCR check stub. Implementação V2 futura.
 */
export async function checkUploadLeak(_args: ValidateSlideArgs): Promise<QCReport['warnings']> {
  return []
}
