/**
 * Subtemplate: image-focus (Fase 6 v3, BUG-M2-006)
 *
 * Layout pra slides "olhe esta imagem" sem bullets — content_3/content_6
 * herdado quando o LLM extrai `bullets=[]` mas `imagePrompt` presente.
 * Antes da Fase 6 v3 esses slides caíam em content-3-boxes com coluna
 * esquerda vazia + imagem solta no canto direito.
 *
 * Layout:
 *   - title (topo): ExtraBold 48-80, h=220, max 2 linhas, centralizado
 *   - image-main (hero central): 700×600, rounded, x=190 y=380
 *   - subtitle (rodapé): SemiBold 28-40, h=160, max 3 linhas, centralizado
 *
 * Roteamento pelo Planner: quando slideType ∈ {content_3, content_6} E
 * parsed.bullets.length === 0 E (imagePrompt presente OU upload presente).
 */

import * as React from 'react'
import type { ImageSlotDef, Rect, TextSlotDef } from '../types'
import { renderTextLines } from './_shared'
import type { SubtemplateModule, SubtemplateRenderArgs } from './types'

const TITLE_BOX: Rect = { x: 80, y: 130, w: 920, h: 220 }
const IMAGE_BOX: Rect = { x: 190, y: 380, w: 700, h: 600 }
const SUBTITLE_BOX: Rect = { x: 80, y: 1000, w: 920, h: 160 }

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

const SUBTITLE_SLOT_DEF: TextSlotDef = {
  id: 'subtitle',
  box: SUBTITLE_BOX,
  fontStack: 'body',
  fontWeight: 600,
  fontSizeMin: 24,
  fontSizeMax: 40,
  lineHeight: 1.25,
  maxLines: 3,
}

const IMAGE_MAIN_DEF: ImageSlotDef = {
  id: 'image-main',
  box: IMAGE_BOX,
  acceptsUpload: true,
  defaultTreatment: 'rounded',
}

function inferTextColor(args: SubtemplateRenderArgs): string {
  return args.background.contrast === 'light-text' ? '#FFFFFF' : args.background.palette.primary
}

function renderTree(args: SubtemplateRenderArgs): React.ReactElement {
  const titleSlot = args.textSlots.find((s) => s.id === 'title')
  const subtitleSlot = args.textSlots.find((s) => s.id === 'subtitle')

  const titleFontSize = args.resolvedFontSizes.get('title') ?? TITLE_SLOT_DEF.fontSizeMin
  const titleLines = args.resolvedLines.get('title') ?? (titleSlot ? [titleSlot.content] : [])

  const subtitleFontSize = args.resolvedFontSizes.get('subtitle') ?? SUBTITLE_SLOT_DEF.fontSizeMin
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

      {/* Image-main: composto via Sharp em compose.ts. Subtemplate não renderiza
          placeholder pra evitar ghost atrás da imagem real. */}

      {subtitleSlot && subtitleLines.length > 0 && (
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
    </div>
  )
}

export const imageFocusModule: SubtemplateModule = {
  config: {
    id: 'image-focus',
    textSlots: [TITLE_SLOT_DEF, SUBTITLE_SLOT_DEF],
    imageSlots: [IMAGE_MAIN_DEF],
    density: 'sparse',
    compatibleBackgrounds: ['*'],
  },
  render: renderTree,
}

export default imageFocusModule
