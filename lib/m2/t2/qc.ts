/**
 * T2 QC — validador programático com score
 *
 * Fase 1 (mínimo):
 *   - CANVAS_DIM_WRONG: confere via sharp metadata
 *   - FOOTER_MISSING: amostra pixels na footer zone, checa se há composite
 *     não-transparente que diferencia do background original
 *
 * Fase 2 expande: TEXT_OUTSIDE_SAFE_AREA, BACKGROUND_LUMA_VS_TEXT, BLEED_CHECK,
 * UPLOAD_LEAKED_REFERENCE.
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

export interface ValidateSlideArgs {
  buffer: Buffer
  plan: SlidePlan
}

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
 * Heurística simples (Fase 1): amostra 8 pixels na footer zone e checa se
 * há áreas com tonalidade próxima de branco/cinza claro (indicando logo
 * + texto do footer overlay).
 *
 * Footer programático tem fundo transparente com elementos brancos (#FEFEFC).
 * Se nenhum pixel da amostra estiver entre R/G/B > 200, considera ausente.
 */
async function checkFooterPresent(
  buffer: Buffer,
  plan: SlidePlan,
): Promise<QCIssue | null> {
  if (!plan.footer.enabled) return null

  // Extrai região do footer pra análise.
  const region = await sharp(buffer)
    .extract({
      left: 0,
      top: FOOTER_TOP,
      width: T2_CANVAS_WIDTH,
      height: FOOTER_HEIGHT,
    })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { data, info } = region
  const { width, height, channels } = info

  // Amostra 16 pontos distribuídos na faixa.
  let brightPixels = 0
  const samples = 16
  for (let i = 0; i < samples; i++) {
    const x = Math.floor(((i + 0.5) / samples) * width)
    const y = Math.floor(height / 2)
    const idx = (y * width + x) * channels
    const r = data[idx] ?? 0
    const g = data[idx + 1] ?? 0
    const b = data[idx + 2] ?? 0
    if (r > 200 && g > 200 && b > 200) brightPixels++
  }

  if (brightPixels === 0) {
    return {
      code: 'FOOTER_MISSING',
      severity: 'error',
      message: 'Footer não detectado — nenhum pixel claro encontrado na footer zone',
    }
  }
  return null
}

function computeScore(errors: QCIssue[], warnings: QCIssue[]): number {
  return Math.max(0, 100 - 20 * errors.length - 5 * warnings.length)
}

export async function validateSlide(args: ValidateSlideArgs): Promise<QCReport> {
  const issues: QCIssue[] = []

  const dimIssue = await checkCanvasDim(args.buffer)
  if (dimIssue) issues.push(dimIssue)

  // Só checa footer se canvas tiver dim correto (senão extract falha).
  if (!dimIssue) {
    const footerIssue = await checkFooterPresent(args.buffer, args.plan)
    if (footerIssue) issues.push(footerIssue)
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
 * OCR check stub. Implementação na Fase 2.
 */
export async function checkUploadLeak(_args: ValidateSlideArgs): Promise<QCReport['warnings']> {
  // Fase 2: integrar com tesseract.js ou similar.
  return []
}
