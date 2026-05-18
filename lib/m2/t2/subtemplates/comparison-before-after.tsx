/**
 * Subtemplate: comparison-before-after (Fase 2)
 *
 * Layout: título topo + 2 imageSlots lado a lado com labels "ANTES"/"DEPOIS"
 * + caption rodapé.
 *
 * Slots:
 *   - title (topo): ExtraBold 60-90, maxLines 3
 *   - label-before / label-after: SemiBold 24-32 (1 linha)
 *   - caption (rodapé): SemiBold 28-36, maxLines 3
 *
 * ImageSlots:
 *   - image-before: 380×480 lado esquerdo
 *   - image-after:  380×480 lado direito
 *
 * Imagens são compostas em compose.ts via Sharp; o subtemplate renderiza
 * boxes vazias com bordas rounded como guia visual (placeholders).
 */

import * as React from 'react'
import type { ImageSlotDef, Rect, TextSlotDef } from '../types'
import { renderTextLines } from './_shared'
import type { SubtemplateModule, SubtemplateRenderArgs } from './types'

// Geometria
const SAFE_LEFT = 80
const SAFE_WIDTH = 920

const TITLE_BOX: Rect = { x: SAFE_LEFT, y: 100, w: SAFE_WIDTH, h: 280 }

const IMG_W = 380
const IMG_H = 480
const IMG_Y = 460
const IMG_GAP = 60
const IMG_LEFT_X = (1080 - (IMG_W * 2 + IMG_GAP)) / 2 // 130
const IMG_RIGHT_X = IMG_LEFT_X + IMG_W + IMG_GAP

const IMAGE_BEFORE_BOX: Rect = { x: IMG_LEFT_X, y: IMG_Y, w: IMG_W, h: IMG_H }
const IMAGE_AFTER_BOX: Rect = { x: IMG_RIGHT_X, y: IMG_Y, w: IMG_W, h: IMG_H }

const LABEL_BEFORE_BOX: Rect = { x: IMG_LEFT_X, y: IMG_Y - 50, w: IMG_W, h: 40 }
const LABEL_AFTER_BOX: Rect = { x: IMG_RIGHT_X, y: IMG_Y - 50, w: IMG_W, h: 40 }

const CAPTION_BOX: Rect = { x: SAFE_LEFT, y: IMG_Y + IMG_H + 40, w: SAFE_WIDTH, h: 200 }

const TITLE_SLOT_DEF: TextSlotDef = {
  id: 'title',
  box: TITLE_BOX,
  fontStack: 'display',
  fontWeight: 800,
  fontSizeMin: 60,
  fontSizeMax: 90,
  lineHeight: 1.05,
  maxLines: 3,
}

const LABEL_BEFORE_DEF: TextSlotDef = {
  id: 'label-before',
  box: LABEL_BEFORE_BOX,
  fontStack: 'body',
  fontWeight: 700,
  fontSizeMin: 24,
  fontSizeMax: 32,
  lineHeight: 1.1,
  maxLines: 1,
}

const LABEL_AFTER_DEF: TextSlotDef = {
  ...LABEL_BEFORE_DEF,
  id: 'label-after',
  box: LABEL_AFTER_BOX,
}

const CAPTION_DEF: TextSlotDef = {
  id: 'caption',
  box: CAPTION_BOX,
  fontStack: 'body',
  fontWeight: 600,
  fontSizeMin: 28,
  fontSizeMax: 36,
  lineHeight: 1.3,
  maxLines: 3,
}

const IMAGE_BEFORE_DEF: ImageSlotDef = {
  id: 'image-before',
  box: IMAGE_BEFORE_BOX,
  acceptsUpload: true,
  defaultTreatment: 'rounded',
}

const IMAGE_AFTER_DEF: ImageSlotDef = {
  id: 'image-after',
  box: IMAGE_AFTER_BOX,
  acceptsUpload: false,
  defaultTreatment: 'rounded',
}

function inferTextColor(args: SubtemplateRenderArgs): string {
  return args.background.contrast === 'light-text' ? '#FFFFFF' : args.background.palette.primary
}

function renderTree(args: SubtemplateRenderArgs): React.ReactElement {
  const titleSlot = args.textSlots.find((s) => s.id === 'title')
  const labelBeforeSlot = args.textSlots.find((s) => s.id === 'label-before')
  const labelAfterSlot = args.textSlots.find((s) => s.id === 'label-after')
  const captionSlot = args.textSlots.find((s) => s.id === 'caption')

  const titleFontSize = args.resolvedFontSizes.get('title') ?? TITLE_SLOT_DEF.fontSizeMin
  const titleLines = args.resolvedLines.get('title') ?? (titleSlot ? [titleSlot.content] : [])

  const labelFontSize = args.resolvedFontSizes.get('label-before') ?? LABEL_BEFORE_DEF.fontSizeMin
  const labelBeforeLines =
    args.resolvedLines.get('label-before') ?? (labelBeforeSlot ? [labelBeforeSlot.content] : [])
  const labelAfterLines =
    args.resolvedLines.get('label-after') ?? (labelAfterSlot ? [labelAfterSlot.content] : [])

  const captionFontSize = args.resolvedFontSizes.get('caption') ?? CAPTION_DEF.fontSizeMin
  const captionLines = args.resolvedLines.get('caption') ?? (captionSlot ? [captionSlot.content] : [])

  const textColor = inferTextColor(args)
  // Borda dos boxes — sutil pra não competir com imagem.
  const boxStroke =
    args.background.contrast === 'light-text' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)'
  const boxFill =
    args.background.contrast === 'light-text' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '1080px', height: '1350px', position: 'relative' }}>
      {/* Title topo */}
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

      {/* Labels acima dos boxes */}
      {labelBeforeSlot && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: LABEL_BEFORE_BOX.x,
            top: LABEL_BEFORE_BOX.y,
            width: LABEL_BEFORE_BOX.w,
            height: LABEL_BEFORE_BOX.h,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {renderTextLines({
            lines: labelBeforeLines.map((l) => l.toUpperCase()),
            fontWeight: 700,
            fontSize: labelFontSize,
            lineHeight: 1.1,
            color: textColor,
            letterSpacing: '0.05em',
          })}
        </div>
      )}
      {labelAfterSlot && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: LABEL_AFTER_BOX.x,
            top: LABEL_AFTER_BOX.y,
            width: LABEL_AFTER_BOX.w,
            height: LABEL_AFTER_BOX.h,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {renderTextLines({
            lines: labelAfterLines.map((l) => l.toUpperCase()),
            fontWeight: 700,
            fontSize: labelFontSize,
            lineHeight: 1.1,
            color: textColor,
            letterSpacing: '0.05em',
          })}
        </div>
      )}

      {/* Boxes de imagem (placeholders visuais — image real é composta no Sharp) */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: IMAGE_BEFORE_BOX.x,
          top: IMAGE_BEFORE_BOX.y,
          width: IMAGE_BEFORE_BOX.w,
          height: IMAGE_BEFORE_BOX.h,
          backgroundColor: boxFill,
          border: `2px solid ${boxStroke}`,
          borderRadius: 16,
        }}
      />
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: IMAGE_AFTER_BOX.x,
          top: IMAGE_AFTER_BOX.y,
          width: IMAGE_AFTER_BOX.w,
          height: IMAGE_AFTER_BOX.h,
          backgroundColor: boxFill,
          border: `2px solid ${boxStroke}`,
          borderRadius: 16,
        }}
      />

      {/* Seta entre os 2 boxes */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: IMG_LEFT_X + IMG_W,
          top: IMG_Y + IMG_H / 2 - 30,
          width: IMG_GAP,
          height: 60,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: 'Montserrat',
            fontWeight: 800,
            fontSize: 56,
            color: args.background.contrast === 'light-text' ? '#4CDDC3' : args.background.palette.primary,
            lineHeight: 1,
          }}
        >
          →
        </div>
      </div>

      {/* Caption */}
      {captionSlot && (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: CAPTION_BOX.x,
            top: CAPTION_BOX.y,
            width: CAPTION_BOX.w,
            height: CAPTION_BOX.h,
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          {renderTextLines({
            lines: captionLines,
            fontWeight: CAPTION_DEF.fontWeight,
            fontSize: captionFontSize,
            lineHeight: CAPTION_DEF.lineHeight,
            color: textColor,
            opacity: 0.92,
          })}
        </div>
      )}
    </div>
  )
}

export const comparisonBeforeAfterModule: SubtemplateModule = {
  config: {
    id: 'comparison-before-after',
    textSlots: [TITLE_SLOT_DEF, LABEL_BEFORE_DEF, LABEL_AFTER_DEF, CAPTION_DEF],
    imageSlots: [IMAGE_BEFORE_DEF, IMAGE_AFTER_DEF],
    density: 'medium',
    compatibleBackgrounds: ['*'],
  },
  render: renderTree,
}

export default comparisonBeforeAfterModule
