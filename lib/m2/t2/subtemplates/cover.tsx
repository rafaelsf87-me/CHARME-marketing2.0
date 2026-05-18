/**
 * Subtemplate: cover (Fase 1)
 *
 * Layout cover (capa do carrossel):
 *   - Title slot: top, Montserrat ExtraBold 60-140, alignment center, maxLines 3
 *   - Subtitle slot: centro, Montserrat SemiBold 28-48, alignment center, maxLines 2
 *
 * Slots seguem o template SVG de safeAreas (60..1020 × 60..1190).
 *
 * Renderiza Satori tree consumindo `resolvedFontSizes` calculados via
 * fitTextToBox antes de chamar `render`.
 */

import * as React from 'react'
import type { Rect, TextSlotDef } from '../types'
import type { SubtemplateModule, SubtemplateRenderArgs } from './types'

// Coords absolutas no canvas 1080×1350.
const TITLE_BOX: Rect = { x: 80, y: 200, w: 920, h: 460 }
const SUBTITLE_BOX: Rect = { x: 80, y: 720, w: 920, h: 260 }

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

/**
 * Cor de texto inferida do contrast do background.
 * light-text → branco com leve tint. dark-text → primary palette (escuro).
 */
function inferTextColor(args: SubtemplateRenderArgs): string {
  return args.background.contrast === 'light-text' ? '#FFFFFF' : args.background.palette.primary
}

function renderLines(
  lines: string[],
  fontWeight: number,
  fontSize: number,
  lineHeight: number,
  color: string,
  opacity: number,
): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      {lines.map((ln, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            fontFamily: 'Montserrat',
            fontWeight,
            fontSize,
            lineHeight,
            color,
            opacity,
            textAlign: 'center',
            justifyContent: 'center',
            letterSpacing: '-0.02em',
            // Linhas já foram quebradas pelo text-renderer — Satori não pode
            // re-quebrar uma linha individual (forçaria divergência).
            whiteSpace: 'nowrap',
          }}
        >
          {ln}
        </div>
      ))}
    </div>
  )
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
            alignItems: 'center',
            justifyContent: 'center',
            textTransform: 'uppercase',
          }}
        >
          {renderLines(
            titleLines.map((l) => l.toUpperCase()),
            TITLE_SLOT_DEF.fontWeight,
            titleFontSize,
            TITLE_SLOT_DEF.lineHeight,
            textColor,
            1,
          )}
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
          {renderLines(
            subtitleLines,
            SUBTITLE_SLOT_DEF.fontWeight,
            subtitleFontSize,
            SUBTITLE_SLOT_DEF.lineHeight,
            textColor,
            0.92,
          )}
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
