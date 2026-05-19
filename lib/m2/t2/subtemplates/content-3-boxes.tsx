/**
 * Subtemplate: content-3-boxes (Fase 6 — imageSlot opcional, layout split)
 *
 * Layout:
 *   SEM imagem (default Fase 2/3 — retro-compat):
 *     title (full-width topo) + box-1..3 empilhadas (full-width).
 *
 *   COM imagem (BUG-M2-004 Fase 6):
 *     title full-width topo. Boxes 1-3 esquerda (w=440), image-main direita
 *     (460×780, rounded). Layout half-and-half.
 *
 * BUG-M2-005: alignItems trocado de flex-end pra center; overflow hidden.
 */

import * as React from 'react'
import type { ImageSlotDef, Rect, SlidePlan, TextSlotDef } from '../types'
import { renderTextLines } from './_shared'
import type { SubtemplateModule, SubtemplateRenderArgs } from './types'

// ─── Layouts SEM imagem (atual full-width) ─────────────────────────────────

const SAFE_LEFT = 80
const SAFE_WIDTH = 920

const TITLE_BOX: Rect = { x: SAFE_LEFT, y: 130, w: SAFE_WIDTH, h: 220 }

const BOX_HEIGHT_NO_IMG = 240
const BOX_GAP = 40
const BOXES_START_Y = 410
const BOX_1_NO_IMG: Rect = { x: SAFE_LEFT, y: BOXES_START_Y, w: SAFE_WIDTH, h: BOX_HEIGHT_NO_IMG }
const BOX_2_NO_IMG: Rect = {
  x: SAFE_LEFT,
  y: BOXES_START_Y + BOX_HEIGHT_NO_IMG + BOX_GAP,
  w: SAFE_WIDTH,
  h: BOX_HEIGHT_NO_IMG,
}
const BOX_3_NO_IMG: Rect = {
  x: SAFE_LEFT,
  y: BOXES_START_Y + (BOX_HEIGHT_NO_IMG + BOX_GAP) * 2,
  w: SAFE_WIDTH,
  h: BOX_HEIGHT_NO_IMG,
}

// ─── Layouts COM imagem (split half-half) ──────────────────────────────────

const LEFT_COL_W = 440
const IMG_LEFT = 540
const IMG_WIDTH = 460
const IMG_TOP = 380
const IMG_HEIGHT = 780

const BOX_HEIGHT_WITH_IMG = 240
const BOXES_START_Y_WITH_IMG = 380
const BOXES_GAP_WITH_IMG = 30

const BOX_1_WITH_IMG: Rect = { x: SAFE_LEFT, y: BOXES_START_Y_WITH_IMG, w: LEFT_COL_W, h: BOX_HEIGHT_WITH_IMG }
const BOX_2_WITH_IMG: Rect = {
  x: SAFE_LEFT,
  y: BOXES_START_Y_WITH_IMG + BOX_HEIGHT_WITH_IMG + BOXES_GAP_WITH_IMG,
  w: LEFT_COL_W,
  h: BOX_HEIGHT_WITH_IMG,
}
const BOX_3_WITH_IMG: Rect = {
  x: SAFE_LEFT,
  y: BOXES_START_Y_WITH_IMG + (BOX_HEIGHT_WITH_IMG + BOXES_GAP_WITH_IMG) * 2,
  w: LEFT_COL_W,
  h: BOX_HEIGHT_WITH_IMG,
}

const IMAGE_MAIN_BOX: Rect = { x: IMG_LEFT, y: IMG_TOP, w: IMG_WIDTH, h: IMG_HEIGHT }

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

function boxSlotDefNoImg(id: string, box: Rect): TextSlotDef {
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

function boxSlotDefWithImg(id: string, box: Rect): TextSlotDef {
  return {
    id,
    box,
    fontStack: 'body',
    fontWeight: 600,
    // Compactado — caixa menor (w=440 vs 920) força fontSize menor pra wrap.
    fontSizeMin: 24,
    fontSizeMax: 34,
    lineHeight: 1.2,
    maxLines: 3,
  }
}

const BOX_DEFS_NO_IMG: TextSlotDef[] = [
  boxSlotDefNoImg('box-1', BOX_1_NO_IMG),
  boxSlotDefNoImg('box-2', BOX_2_NO_IMG),
  boxSlotDefNoImg('box-3', BOX_3_NO_IMG),
]

const BOX_DEFS_WITH_IMG: TextSlotDef[] = [
  boxSlotDefWithImg('box-1', BOX_1_WITH_IMG),
  boxSlotDefWithImg('box-2', BOX_2_WITH_IMG),
  boxSlotDefWithImg('box-3', BOX_3_WITH_IMG),
]

const IMAGE_MAIN_DEF: ImageSlotDef = {
  id: 'image-main',
  box: IMAGE_MAIN_BOX,
  acceptsUpload: true,
  defaultTreatment: 'rounded',
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function inferTextColor(args: SubtemplateRenderArgs): string {
  return args.background.contrast === 'light-text' ? '#FFFFFF' : args.background.palette.primary
}

function hasImageMainSlot(args: SubtemplateRenderArgs): boolean {
  return args.imageSlots.some((s) => s.id === 'image-main')
}

function renderTree(args: SubtemplateRenderArgs): React.ReactElement {
  const withImage = hasImageMainSlot(args)
  const boxes = withImage
    ? { b1: BOX_1_WITH_IMG, b2: BOX_2_WITH_IMG, b3: BOX_3_WITH_IMG }
    : { b1: BOX_1_NO_IMG, b2: BOX_2_NO_IMG, b3: BOX_3_NO_IMG }

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
          justifyContent: withImage ? 'flex-start' : 'center',
          overflow: 'hidden',
        }}
      >
        {renderTextLines({
          lines,
          fontWeight: 600,
          fontSize,
          lineHeight: 1.25,
          color: textColor,
          align: withImage ? 'left' : 'center',
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
      {renderBox('box-1', boxes.b1)}
      {renderBox('box-2', boxes.b2)}
      {renderBox('box-3', boxes.b3)}
    </div>
  )
}

function planHasImageMain(plan: SlidePlan): boolean {
  return plan.imageSlots.some((s) => s.id === 'image-main')
}

export const content3BoxesModule: SubtemplateModule = {
  config: {
    id: 'content-3-boxes',
    textSlots: [TITLE_SLOT_DEF, ...BOX_DEFS_NO_IMG],
    imageSlots: [IMAGE_MAIN_DEF],
    density: 'medium',
    compatibleBackgrounds: ['*'],
  },
  render: renderTree,
  resolveTextSlotDefs: (plan) =>
    planHasImageMain(plan)
      ? [TITLE_SLOT_DEF, ...BOX_DEFS_WITH_IMG]
      : [TITLE_SLOT_DEF, ...BOX_DEFS_NO_IMG],
}

export default content3BoxesModule
