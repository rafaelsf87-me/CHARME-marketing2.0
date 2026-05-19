/**
 * Subtemplate: cta-final (Fase 6 — imageSlot opcional como badge hero topo)
 *
 * Layout principal mantém Fase 2/3 (title 240..660, subtitle 700..920,
 * cta 960..1080, footer embutido no PNG ocupando últimos 250px).
 *
 * COM imagem (BUG-M2-004 Fase 6, conservador):
 *   - image-main pequeno (360×160) no topo (y=70..230), treatment 'circle'.
 *   - title/subtitle/cta inalterados (não competem com hero topo).
 *   - Planner SÓ cria slot SE LLM devolver imagePrompt explícito pra cta_final.
 *
 * BUG-M2-005: alignItems trocado de flex-end pra center; overflow hidden.
 */

import * as React from 'react'
import type { ImageSlotDef, Rect, TextSlotDef } from '../types'
import { renderTextLines } from './_shared'
import type { SubtemplateModule, SubtemplateRenderArgs } from './types'

const SAFE_LEFT = 80
const SAFE_WIDTH = 920

const TITLE_BOX: Rect = { x: SAFE_LEFT, y: 240, w: SAFE_WIDTH, h: 420 }
const SUBTITLE_BOX: Rect = { x: SAFE_LEFT, y: 700, w: SAFE_WIDTH, h: 220 }
const CTA_BOX: Rect = { x: SAFE_LEFT, y: 960, w: SAFE_WIDTH, h: 120 }

// Image hero topo (decorativo, opcional)
const IMAGE_MAIN_BOX: Rect = { x: 360, y: 70, w: 360, h: 160 }

const TITLE_SLOT_DEF: TextSlotDef = {
  id: 'title',
  box: TITLE_BOX,
  fontStack: 'display',
  fontWeight: 800,
  fontSizeMin: 80,
  fontSizeMax: 140,
  lineHeight: 1.05,
  maxLines: 3,
}

const SUBTITLE_SLOT_DEF: TextSlotDef = {
  id: 'subtitle',
  box: SUBTITLE_BOX,
  fontStack: 'body',
  fontWeight: 600,
  fontSizeMin: 40,
  fontSizeMax: 56,
  lineHeight: 1.2,
  maxLines: 3,
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
