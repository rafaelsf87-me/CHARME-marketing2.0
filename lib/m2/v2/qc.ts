/**
 * V2 QC — validação programática mínima do PNG final
 *
 * Verifica:
 *  - Canvas exato 1080×1350 (invariante)
 *  - Buffer não-vazio
 *  - Title não-vazio no plan
 *  - Bullets dentro do limite máximo (4)
 *  - CTA-FINAL: tem ctaButtonTexto
 *
 * NÃO falha geração — retorna QCReport com warnings/errors pra log.
 */

import sharp from 'sharp'
import { V2_CANVAS_WIDTH, V2_CANVAS_HEIGHT, type V2Plan } from './types'

export type V2QCSeverity = 'error' | 'warning'

export interface V2QCIssue {
  code: string
  severity: V2QCSeverity
  message: string
}

export interface V2QCReport {
  pass: boolean
  issues: V2QCIssue[]
}

export async function runQc(buffer: Buffer, plan: V2Plan): Promise<V2QCReport> {
  const issues: V2QCIssue[] = []

  // 1. Canvas dimensions
  try {
    const meta = await sharp(buffer).metadata()
    if (meta.width !== V2_CANVAS_WIDTH || meta.height !== V2_CANVAS_HEIGHT) {
      issues.push({
        code: 'CANVAS_DIM_WRONG',
        severity: 'error',
        message: `Esperado ${V2_CANVAS_WIDTH}×${V2_CANVAS_HEIGHT}, obtido ${meta.width}×${meta.height}`,
      })
    }
  } catch (err) {
    issues.push({
      code: 'SHARP_METADATA_FAIL',
      severity: 'error',
      message: `Sharp metadata falhou: ${(err as Error).message}`,
    })
  }

  // 2. Buffer não-vazio
  if (buffer.byteLength < 10_000) {
    issues.push({
      code: 'BUFFER_TOO_SMALL',
      severity: 'warning',
      message: `Buffer suspeito de erro: ${buffer.byteLength} bytes (esperado >10KB)`,
    })
  }

  // 3. Title não-vazio
  if (!plan.titulo || plan.titulo.trim().length === 0) {
    issues.push({
      code: 'TITLE_EMPTY',
      severity: 'error',
      message: 'Plan tem titulo vazio',
    })
  }

  // 4. Bullets limit
  if (plan.bullets.length > 4) {
    issues.push({
      code: 'TOO_MANY_BULLETS',
      severity: 'error',
      message: `Bullets excedem limite V2.0 (${plan.bullets.length}/4)`,
    })
  }

  // 5. CTA-FINAL precisa de botão
  if (plan.templateType === 'cta-final' && !plan.ctaButtonTexto) {
    issues.push({
      code: 'CTA_BUTTON_MISSING',
      severity: 'error',
      message: 'CTA-FINAL sem ctaButtonTexto',
    })
  }

  const hasError = issues.some((i) => i.severity === 'error')
  return { pass: !hasError, issues }
}
