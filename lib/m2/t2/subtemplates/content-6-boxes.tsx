/**
 * Subtemplate: content-6-boxes (Fase 6 — imageSlot opcional, layout split)
 *
 * Layout:
 *   SEM imagem (default Fase 2/3):
 *     title topo + 6 boxes empilhadas com setinhas → (full-width).
 *
 *   COM imagem (BUG-M2-004 Fase 6):
 *     title topo + 6 boxes esquerda (compactas) + image-main direita (420×810).
 *
 * BUG-M2-005: alignItems trocado de flex-end pra center; overflow hidden.
 */

import * as React from 'react'
import type { ImageSlotDef, Rect, SlidePlan, TextSlotDef } from '../types'
import { renderTextLines } from './_shared'
import type { SubtemplateModule, SubtemplateRenderArgs } from './types'

const SAFE_LEFT = 80
const SAFE_WIDTH = 920

const TITLE_BOX: Rect = { x: SAFE_LEFT, y: 130, w: SAFE_WIDTH, h: 200 }

// ─── Layout SEM imagem (atual) ─────────────────────────────────────────────
//
// Fase 6 v2 (19/05/2026): step vertical comprimido (148→112) pra eliminar
// "vazio entre bullets" reportado no smoke Fase 6. Continua dentro da safe
// area (y final 1032 < bottom 1170).

const BOX_HEIGHT = 100
const BOX_GAP = 12
const BOXES_START_Y = 360
const ARROW_W_NO_IMG = 70
const BOX_X_NO_IMG = SAFE_LEFT + ARROW_W_NO_IMG + 20
const BOX_W_NO_IMG = SAFE_WIDTH - ARROW_W_NO_IMG - 20

// ─── Layout COM imagem (split: arrow + box esquerda + image direita) ──────

const ARROW_W_WITH_IMG = 50
const BOX_X_WITH_IMG = SAFE_LEFT + ARROW_W_WITH_IMG + 20
const BOX_W_WITH_IMG = 400
const IMG_LEFT_WITH_IMG = 580
const IMG_TOP_WITH_IMG = 360
const IMG_WIDTH_WITH_IMG = 420
const IMG_HEIGHT_WITH_IMG = 810

function boxRect(i: number, withImage: boolean): Rect {
  return {
    x: withImage ? BOX_X_WITH_IMG : BOX_X_NO_IMG,
    y: BOXES_START_Y + i * (BOX_HEIGHT + BOX_GAP),
    w: withImage ? BOX_W_WITH_IMG : BOX_W_NO_IMG,
    h: BOX_HEIGHT,
  }
}

function arrowRect(i: number, withImage: boolean): Rect {
  return {
    x: SAFE_LEFT,
    y: BOXES_START_Y + i * (BOX_HEIGHT + BOX_GAP),
    w: withImage ? ARROW_W_WITH_IMG : ARROW_W_NO_IMG,
    h: BOX_HEIGHT,
  }
}

const TITLE_SLOT_DEF: TextSlotDef = {
  id: 'title',
  box: TITLE_BOX,
  fontStack: 'display',
  fontWeight: 800,
  fontSizeMin: 56,
  fontSizeMax: 72,
  lineHeight: 1.05,
  maxLines: 2,
}

function boxSlotDef(id: string, box: Rect, withImage: boolean): TextSlotDef {
  return {
    id,
    box,
    fontStack: 'body',
    fontWeight: 600,
    fontSizeMin: 24,
    // Sem imagem: 32. Com imagem (box menor): 28 (compacta).
    fontSizeMax: withImage ? 28 : 32,
    lineHeight: 1.25,
    maxLines: 2,
  }
}

function buildBoxDefs(withImage: boolean): TextSlotDef[] {
  return Array.from({ length: 6 }, (_, i) =>
    boxSlotDef(`box-${i + 1}`, boxRect(i, withImage), withImage),
  )
}

const BOX_DEFS_NO_IMG = buildBoxDefs(false)
const BOX_DEFS_WITH_IMG = buildBoxDefs(true)

const IMAGE_MAIN_DEF: ImageSlotDef = {
  id: 'image-main',
  box: { x: IMG_LEFT_WITH_IMG, y: IMG_TOP_WITH_IMG, w: IMG_WIDTH_WITH_IMG, h: IMG_HEIGHT_WITH_IMG },
  acceptsUpload: true,
  defaultTreatment: 'rounded',
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function inferTextColor(args: SubtemplateRenderArgs): string {
  return args.background.contrast === 'light-text' ? '#FFFFFF' : args.background.palette.primary
}

function inferAccentColor(args: SubtemplateRenderArgs): string {
  return args.background.contrast === 'light-text' ? '#4CDDC3' : args.background.palette.primary
}

function hasImageMainSlot(args: SubtemplateRenderArgs): boolean {
  return args.imageSlots.some((s) => s.id === 'image-main')
}

function renderTree(args: SubtemplateRenderArgs): React.ReactElement {
  const withImage = hasImageMainSlot(args)
  const titleSlot = args.textSlots.find((s) => s.id === 'title')
  const titleFontSize = args.resolvedFontSizes.get('title') ?? TITLE_SLOT_DEF.fontSizeMin
  const titleLines = args.resolvedLines.get('title') ?? (titleSlot ? [titleSlot.content] : [])
  const textColor = inferTextColor(args)
  const accentColor = inferAccentColor(args)

  const renderBoxWithArrow = (i: number) => {
    const boxId = `box-${i + 1}`
    const slot = args.textSlots.find((s) => s.id === boxId)
    if (!slot) return null
    const box = boxRect(i, withImage)
    const arrow = arrowRect(i, withImage)
    const fontSize = args.resolvedFontSizes.get(boxId) ?? 24
    const lines = args.resolvedLines.get(boxId) ?? [slot.content]
    return (
      <React.Fragment key={boxId}>
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: arrow.x,
            top: arrow.y,
            width: arrow.w,
            height: arrow.h,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontFamily: 'Montserrat',
              fontWeight: 800,
              fontSize: withImage ? 48 : 64,
              color: accentColor,
              lineHeight: 1,
            }}
          >
            →
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: box.x,
            top: box.y,
            width: box.w,
            height: box.h,
            alignItems: 'center',
            justifyContent: 'flex-start',
            overflow: 'hidden',
          }}
        >
          {renderTextLines({
            lines,
            fontWeight: 600,
            fontSize,
            lineHeight: 1.25,
            color: textColor,
            align: 'left',
          })}
        </div>
      </React.Fragment>
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
      {Array.from({ length: 6 }, (_, i) => renderBoxWithArrow(i))}
    </div>
  )
}

function planHasImageMain(plan: SlidePlan): boolean {
  return plan.imageSlots.some((s) => s.id === 'image-main')
}

export const content6BoxesModule: SubtemplateModule = {
  config: {
    id: 'content-6-boxes',
    textSlots: [TITLE_SLOT_DEF, ...BOX_DEFS_NO_IMG],
    imageSlots: [IMAGE_MAIN_DEF],
    density: 'busy',
    compatibleBackgrounds: ['*'],
  },
  render: renderTree,
  resolveTextSlotDefs: (plan) =>
    planHasImageMain(plan)
      ? [TITLE_SLOT_DEF, ...BOX_DEFS_WITH_IMG]
      : [TITLE_SLOT_DEF, ...BOX_DEFS_NO_IMG],
}

export default content6BoxesModule
