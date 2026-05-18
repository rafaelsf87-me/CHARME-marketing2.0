/**
 * Subtemplate: content-3-boxes (Fase 2)
 *
 * Layout: até 3 blocos de texto empilhados verticalmente.
 *
 * Slots:
 *   - title (opcional, topo): ExtraBold 48-80, maxLines 2
 *   - box-1, box-2, box-3: SemiBold 32-44, maxLines 3 cada
 *
 * Gap entre boxes: 40px. Cor herda de bg.contrast.
 */

import * as React from 'react'
import type { Rect, TextSlotDef } from '../types'
import { renderTextLines } from './_shared'
import type { SubtemplateModule, SubtemplateRenderArgs } from './types'

const SAFE_LEFT = 80
const SAFE_WIDTH = 920

const TITLE_BOX: Rect = { x: SAFE_LEFT, y: 130, w: SAFE_WIDTH, h: 220 }
const BOX_HEIGHT = 240
const BOX_GAP = 40
const BOXES_START_Y = 410
const BOX_1: Rect = { x: SAFE_LEFT, y: BOXES_START_Y, w: SAFE_WIDTH, h: BOX_HEIGHT }
const BOX_2: Rect = { x: SAFE_LEFT, y: BOXES_START_Y + BOX_HEIGHT + BOX_GAP, w: SAFE_WIDTH, h: BOX_HEIGHT }
const BOX_3: Rect = {
  x: SAFE_LEFT,
  y: BOXES_START_Y + (BOX_HEIGHT + BOX_GAP) * 2,
  w: SAFE_WIDTH,
  h: BOX_HEIGHT,
}

const TITLE_SLOT_DEF: TextSlotDef = {
  id: 'title',
  box: TITLE_BOX,
  fontStack: 'display',
  fontWeight: 800,
  fontSizeMin: 48,
  fontSizeMax: 80,
  lineHeight: 1.05,
  maxLines: 2,
}

function boxSlotDef(id: string, box: Rect): TextSlotDef {
  return {
    id,
    box,
    fontStack: 'body',
    fontWeight: 600,
    fontSizeMin: 32,
    fontSizeMax: 44,
    lineHeight: 1.25,
    maxLines: 3,
  }
}

const BOX_DEFS: TextSlotDef[] = [
  boxSlotDef('box-1', BOX_1),
  boxSlotDef('box-2', BOX_2),
  boxSlotDef('box-3', BOX_3),
]

function inferTextColor(args: SubtemplateRenderArgs): string {
  return args.background.contrast === 'light-text' ? '#FFFFFF' : args.background.palette.primary
}

function renderTree(args: SubtemplateRenderArgs): React.ReactElement {
  const titleSlot = args.textSlots.find((s) => s.id === 'title')
  const titleFontSize = args.resolvedFontSizes.get('title') ?? TITLE_SLOT_DEF.fontSizeMin
  const titleLines = args.resolvedLines.get('title') ?? (titleSlot ? [titleSlot.content] : [])
  const textColor = inferTextColor(args)

  const renderBox = (boxId: string, box: Rect) => {
    const slot = args.textSlots.find((s) => s.id === boxId)
    if (!slot) return null
    const fontSize = args.resolvedFontSizes.get(boxId) ?? 32
    const lines = args.resolvedLines.get(boxId) ?? [slot.content]
    return (
      <div
        key={boxId}
        style={{
          display: 'flex',
          position: 'absolute',
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {renderTextLines({
          lines,
          fontWeight: 600,
          fontSize,
          lineHeight: 1.25,
          color: textColor,
        })}
      </div>
    )
  }

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
            letterSpacing: '-0.02em',
          })}
        </div>
      )}
      {renderBox('box-1', BOX_1)}
      {renderBox('box-2', BOX_2)}
      {renderBox('box-3', BOX_3)}
    </div>
  )
}

export const content3BoxesModule: SubtemplateModule = {
  config: {
    id: 'content-3-boxes',
    textSlots: [TITLE_SLOT_DEF, ...BOX_DEFS],
    imageSlots: [],
    density: 'medium',
    compatibleBackgrounds: ['*'],
  },
  render: renderTree,
}

export default content3BoxesModule
