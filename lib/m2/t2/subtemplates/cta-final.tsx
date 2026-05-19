/**
 * Subtemplate: cta-final (V1.1.1 — image hero ao centro, BUG-M2-009)
 *
 * MUDANÇA DE INVARIANTE V1.1.1 (DEC-M2-015 atualizada):
 *   ANTES: "cta_final default sem imagem (foco no CTA)"
 *   DEPOIS: "cta_final SEMPRE tem imagem (carrossel viral requer imagem
 *           em 100% dos slides)"
 *
 * Layout V1.1.1:
 *   y=80,   h=200          → TITLE     (compacto, max 2 linhas, 80-110px)
 *   y=320,  h=400, x=240   → IMAGE     (hero centro, 600×400, treatment 'rounded')
 *   y=760,  h=140          → SUBTITLE  (1-2 linhas, 38-50px)
 *   y=920,  h=120          → CTA       (1 linha, 36-48px, cyan)
 *   y=1100..1350           → FOOTER    (embutido no PNG atual)
 *
 * BUG-M2-005: alignItems center; overflow hidden.
 */

import * as React from 'react'
import type { ImageSlotDef, Rect, TextSlotDef } from '../types'
import { renderTextLines } from './_shared'
import type { SubtemplateModule, SubtemplateRenderArgs } from './types'

const SAFE_LEFT = 80
const SAFE_WIDTH = 920

const TITLE_BOX: Rect = { x: SAFE_LEFT, y: 80, w: SAFE_WIDTH, h: 200 }
const IMAGE_MAIN_BOX: Rect = { x: 240, y: 320, w: 600, h: 400 }
const SUBTITLE_BOX: Rect = { x: SAFE_LEFT, y: 760, w: SAFE_WIDTH, h: 140 }
const CTA_BOX: Rect = { x: SAFE_LEFT, y: 920, w: SAFE_WIDTH, h: 120 }

const TITLE_SLOT_DEF: TextSlotDef = {
  id: 'title',
  box: TITLE_BOX,
  fontStack: 'display',
  fontWeight: 800,
  fontSizeMin: 60,
  fontSizeMax: 110,
  lineHeight: 1.05,
  maxLines: 2,
}

const SUBTITLE_SLOT_DEF: TextSlotDef = {
  id: 'subtitle',
  box: SUBTITLE_BOX,
  fontStack: 'body',
  fontWeight: 600,
  fontSizeMin: 38,
  fontSizeMax: 50,
  lineHeight: 1.2,
  maxLines: 2,
}

const CTA_SLOT_DEF: TextSlotDef = {
  id: 'cta',
  box: CTA_BOX,
  fontStack: 'display',
  fontWeight: 800,
  fontSizeMin: 32,
  fontSizeMax: 48,
  lineHeight: 1.15,
  maxLines: 2,
  color: '#4CDDC3',
}

const IMAGE_MAIN_DEF: ImageSlotDef = {
  id: 'image-main',
  box: IMAGE_MAIN_BOX,
  acceptsUpload: true,
  defaultTreatment: 'rounded',
}

function inferTextColor(args: SubtemplateRenderArgs): string {
  return args.background.contrast === 'light-text' ? '#FFFFFF' : args.background.palette.primary
}

function renderTree(args: SubtemplateRenderArgs): React.ReactElement {
  const titleSlot = args.textSlots.find((s) => s.id === 'title')
  const subtitleSlot = args.textSlots.find((s) => s.id === 'subtitle')
  const ctaSlot = args.textSlots.find((s) => s.id === 'cta')

  const titleFontSize = args.resolvedFontSizes.get('title') ?? TITLE_SLOT_DEF.fontSizeMin
  const titleLines = args.resolvedLines.get('title') ?? (titleSlot ? [titleSlot.content] : [])

  const subtitleFontSize = args.resolvedFontSizes.get('subtitle') ?? SUBTITLE_SLOT_DEF.fontSizeMin
  const subtitleLines = args.resolvedLines.get('subtitle') ?? (subtitleSlot ? [subtitleSlot.content] : [])

  const ctaFontSize = args.resolvedFontSizes.get('cta') ?? CTA_SLOT_DEF.fontSizeMin
  const ctaLines = args.resolvedLines.get('cta') ?? (ctaSlot ? [ctaSlot.content] : [])

  const textColor = inferTextColor(args)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '1080px', height: '1350px', position: 'relative' }}>
      {titleSlot && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: TITLE_BOX.x,
            top: TITLE_BOX.y,
            width: TITLE_BOX.w,
            height: TITLE_BOX.h,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {renderTextLines({
            lines: titleLines.map((l) => l.toUpperCase()),
            fontWeight: TITLE_SLOT_DEF.fontWeight,
            fontSize: titleFontSize,
            lineHeight: TITLE_SLOT_DEF.lineHeight,
            color: textColor,
            letterSpacing: '-0.02em',
          })}
        </div>
      )}

      {subtitleSlot && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: SUBTITLE_BOX.x,
            top: SUBTITLE_BOX.y,
            width: SUBTITLE_BOX.w,
            height: SUBTITLE_BOX.h,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {renderTextLines({
            lines: subtitleLines,
            fontWeight: SUBTITLE_SLOT_DEF.fontWeight,
            fontSize: subtitleFontSize,
            lineHeight: SUBTITLE_SLOT_DEF.lineHeight,
            color: textColor,
            opacity: 0.92,
          })}
        </div>
      )}

      {ctaSlot && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: CTA_BOX.x,
            top: CTA_BOX.y,
            width: CTA_BOX.w,
            height: CTA_BOX.h,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {renderTextLines({
            lines: ctaLines.map((l) => l.toUpperCase()),
            fontWeight: CTA_SLOT_DEF.fontWeight,
            fontSize: ctaFontSize,
            lineHeight: CTA_SLOT_DEF.lineHeight,
            color: CTA_SLOT_DEF.color ?? '#4CDDC3',
            letterSpacing: '0.04em',
          })}
        </div>
      )}
    </div>
  )
}

export const ctaFinalModule: SubtemplateModule = {
  config: {
    id: 'cta-final',
    textSlots: [TITLE_SLOT_DEF, SUBTITLE_SLOT_DEF, CTA_SLOT_DEF],
    imageSlots: [IMAGE_MAIN_DEF],
    density: 'sparse',
    compatibleBackgrounds: ['*'],
  },
  render: renderTree,
  // cta-final mantém o mesmo layout de texto com ou sem imagem (image-main fica
  // como badge decorativo no topo, sem competir com title/subtitle/cta).
}

export default ctaFinalModule
