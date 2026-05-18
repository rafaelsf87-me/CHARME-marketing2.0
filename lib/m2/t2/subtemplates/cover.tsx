/**
 * Subtemplate: cover (Fase 2 — ajustes pós-validação Fase 1)
 *
 * Layout cover (capa do carrossel):
 *   - Title slot: top, Montserrat ExtraBold 60-140, maxLines 3
 *   - Subtitle slot: logo abaixo do title (gap 40), SemiBold 28-48, maxLines 2
 *
 * Ajustes Fase 2:
 *   - Centralizado verticalmente na safe area útil 60..1190
 *     (sem footer programático mais — DEC-M2-015)
 *   - Gap reduzido: title e subtitle ficam num bloco vertical centralizado
 */

import * as React from 'react'
import type { Rect, TextSlotDef } from '../types'
import { renderTextLines } from './_shared'
import type { SubtemplateModule, SubtemplateRenderArgs } from './types'

// Coords absolutas no canvas 1080×1350.
// Safe area útil em cover sem footer programático: 60..1190 = 1130 px alt.
// Bloco central de texto: title 460h + gap 40 + subtitle 260h = 760h.
// Centro vertical 60..1190 → começa em y=235 ((1130-760)/2 + 60 = 245).
const TITLE_BOX: Rect = { x: 80, y: 280, w: 920, h: 420 }
const SUBTITLE_BOX: Rect = { x: 80, y: 740, w: 920, h: 220 }

const TITLE_SLOT_DEF: TextSlotDef = {
  id: 'title',
  box: TITLE_BOX,
  fontStack: 'display',
  fontWeight: 800,
  fontSizeMin: 60,
  fontSizeMax: 140,
  lineHeight: 1.05,
  maxLines: 3,
}

const SUBTITLE_SLOT_DEF: TextSlotDef = {
  id: 'subtitle',
  box: SUBTITLE_BOX,
  fontStack: 'body',
  fontWeight: 600,
  fontSizeMin: 28,
  fontSizeMax: 48,
  lineHeight: 1.25,
  maxLines: 2,
}

function inferTextColor(args: SubtemplateRenderArgs): string {
  return args.background.contrast === 'light-text' ? '#FFFFFF' : args.background.palette.primary
}

function renderCoverTree(args: SubtemplateRenderArgs): React.ReactElement {
  const titleSlot = args.textSlots.find((s) => s.id === 'title')
  const subtitleSlot = args.textSlots.find((s) => s.id === 'subtitle')
  const titleFontSize = args.resolvedFontSizes.get('title') ?? TITLE_SLOT_DEF.fontSizeMin
  const subtitleFontSize =
    args.resolvedFontSizes.get('subtitle') ?? SUBTITLE_SLOT_DEF.fontSizeMin
  const titleLines = args.resolvedLines.get('title') ?? (titleSlot ? [titleSlot.content] : [])
  const subtitleLines =
    args.resolvedLines.get('subtitle') ?? (subtitleSlot ? [subtitleSlot.content] : [])

  const textColor = inferTextColor(args)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '1080px',
        height: '1350px',
        position: 'relative',
      }}
    >
      {titleSlot && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: TITLE_BOX.x,
            top: TITLE_BOX.y,
            width: TITLE_BOX.w,
            height: TITLE_BOX.h,
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          {renderTextLines({
            lines: titleLines.map((l) => l.toUpperCase()),
            fontWeight: TITLE_SLOT_DEF.fontWeight,
            fontSize: titleFontSize,
            lineHeight: TITLE_SLOT_DEF.lineHeight,
            color: textColor,
            opacity: 1,
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
            alignItems: 'flex-start',
            justifyContent: 'center',
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
    </div>
  )
}

export const coverModule: SubtemplateModule = {
  config: {
    id: 'cover',
    textSlots: [TITLE_SLOT_DEF, SUBTITLE_SLOT_DEF],
    imageSlots: [],
    density: 'sparse',
    compatibleBackgrounds: ['*'],
  },
  render: renderCoverTree,
}

export const COVER_TITLE_DEF = TITLE_SLOT_DEF
export const COVER_SUBTITLE_DEF = SUBTITLE_SLOT_DEF

export default coverModule
