/**
 * Subtemplate: content-6-boxes (Fase 2)
 *
 * Layout: até 6 blocos de texto compactos com setinhas decorativas.
 *
 * Slots:
 *   - title (topo): ExtraBold 56-72, maxLines 2
 *   - box-1..box-6: SemiBold 24-32, maxLines 2 cada
 *
 * Gap entre boxes: 24px. Cor herda de bg.contrast.
 * Cada box leva uma seta "→" Unicode em texto pra preservar legibilidade
 * em qualquer background.
 */

import * as React from 'react'
import type { Rect, TextSlotDef } from '../types'
import { renderTextLines } from './_shared'
import type { SubtemplateModule, SubtemplateRenderArgs } from './types'

const SAFE_LEFT = 80
const SAFE_WIDTH = 920

const TITLE_BOX: Rect = { x: SAFE_LEFT, y: 130, w: SAFE_WIDTH, h: 200 }
// Densificado pós-Fase 2: gap menor + altura ligeiramente menor + setinhas
// maiores ocupam melhor a safe area vertical até a footer zone (1190).
// 6 boxes × 130 alt + 5 gaps × 18 = 870. Inicia em y=370 → termina y=1240.
// Como cta-final-bg-01 e starfields têm safe area bottom 180-250, vou
// começar em 360 e terminar 1230 (ainda dentro da safe area).
const BOX_HEIGHT = 130
const BOX_GAP = 18
const BOXES_START_Y = 360
const ARROW_W = 70
const BOX_X = SAFE_LEFT + ARROW_W + 20
const BOX_W = SAFE_WIDTH - ARROW_W - 20

function boxRect(i: number): Rect {
  return { x: BOX_X, y: BOXES_START_Y + i * (BOX_HEIGHT + BOX_GAP), w: BOX_W, h: BOX_HEIGHT }
}

function arrowRect(i: number): Rect {
  return { x: SAFE_LEFT, y: BOXES_START_Y + i * (BOX_HEIGHT + BOX_GAP), w: ARROW_W, h: BOX_HEIGHT }
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

function boxSlotDef(id: string, box: Rect): TextSlotDef {
  return {
    id,
    box,
    fontStack: 'body',
    fontWeight: 600,
    fontSizeMin: 24,
    fontSizeMax: 32,
    lineHeight: 1.25,
    maxLines: 2,
  }
}

const BOX_DEFS: TextSlotDef[] = Array.from({ length: 6 }, (_, i) => boxSlotDef(`box-${i + 1}`, boxRect(i)))

function inferTextColor(args: SubtemplateRenderArgs): string {
  return args.background.contrast === 'light-text' ? '#FFFFFF' : args.background.palette.primary
}

function inferAccentColor(args: SubtemplateRenderArgs): string {
  // Accent pra setinha: cyan brand quando texto claro, primary palette quando escuro.
  return args.background.contrast === 'light-text' ? '#4CDDC3' : args.background.palette.primary
}

function renderTree(args: SubtemplateRenderArgs): React.ReactElement {
  const titleSlot = args.textSlots.find((s) => s.id === 'title')
  const titleFontSize = args.resolvedFontSizes.get('title') ?? TITLE_SLOT_DEF.fontSizeMin
  const titleLines = args.resolvedLines.get('title') ?? (titleSlot ? [titleSlot.content] : [])
  const textColor = inferTextColor(args)
  const accentColor = inferAccentColor(args)

  const renderBoxWithArrow = (i: number) => {
    const boxId = `box-${i + 1}`
    const slot = args.textSlots.find((s) => s.id === boxId)
    if (!slot) return null
    const box = boxRect(i)
    const arrow = arrowRect(i)
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
              // Densificado pós-Fase 2: setinha mais pesada (36→56 → 64).
              fontSize: 64,
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
      {Array.from({ length: 6 }, (_, i) => renderBoxWithArrow(i))}
    </div>
  )
}

export const content6BoxesModule: SubtemplateModule = {
  config: {
    id: 'content-6-boxes',
    textSlots: [TITLE_SLOT_DEF, ...BOX_DEFS],
    imageSlots: [],
    density: 'busy',
    compatibleBackgrounds: ['*'],
  },
  render: renderTree,
}

export default content6BoxesModule
