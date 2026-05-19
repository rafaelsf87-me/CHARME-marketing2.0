/**
 * Subtemplate: cover (Fase 6 — imageSlot opcional + alignItems center + overflow hidden)
 *
 * Layout cover (capa do carrossel):
 *   SEM imagem (default, retro-compat Fase 2/3):
 *     - Title slot: top centralizado, ExtraBold 60-140, maxLines 3
 *     - Subtitle slot: abaixo do title, SemiBold 28-48, maxLines 2
 *
 *   COM imagem (BUG-M2-004 Fase 6):
 *     - Title comprimido topo (h 200), SemiBold/ExtraBold
 *     - Subtitle compacto (h 140)
 *     - Image hero centralizado abaixo (600×680, rounded)
 *
 * BUG-M2-005: alignItems trocado de 'flex-end' pra 'center'; overflow hidden
 * nos containers de title/subtitle pra evitar estouro visual do canvas.
 */

import * as React from 'react'
import type { ImageSlotDef, Rect, SlidePlan, TextSlotDef } from '../types'
import { renderTextLines } from './_shared'
import type { SubtemplateModule, SubtemplateRenderArgs } from './types'

// ─── Layouts SEM imagem (atual) ────────────────────────────────────────────

const TITLE_BOX_NO_IMG: Rect = { x: 80, y: 280, w: 920, h: 420 }
const SUBTITLE_BOX_NO_IMG: Rect = { x: 80, y: 740, w: 920, h: 220 }

const TITLE_SLOT_NO_IMG: TextSlotDef = {
  id: 'title',
  box: TITLE_BOX_NO_IMG,
  fontStack: 'display',
  fontWeight: 800,
  fontSizeMin: 60,
  fontSizeMax: 140,
  lineHeight: 1.05,
  maxLines: 3,
}

const SUBTITLE_SLOT_NO_IMG: TextSlotDef = {
  id: 'subtitle',
  box: SUBTITLE_BOX_NO_IMG,
  fontStack: 'body',
  fontWeight: 600,
  fontSizeMin: 28,
  fontSizeMax: 48,
  lineHeight: 1.25,
  maxLines: 2,
}

// ─── Layouts COM imagem (Fase 6 BUG-M2-004) ────────────────────────────────

// Fase 6 v3 (MEL-M2-009): coords ajustadas pra suportar titles longos (98+ chars).
// Antes: title h=200, image 600×680. Title de 98 chars caía pra fontSize ~60
// e ficava desproporcional. Agora: title h=280 (até 3 linhas em 64-72px),
// image 500×560 menor mas ainda hero, subtitle h=160 (3 linhas).
const TITLE_BOX_WITH_IMG: Rect = { x: 80, y: 60, w: 920, h: 280 }
const SUBTITLE_BOX_WITH_IMG: Rect = { x: 80, y: 360, w: 920, h: 160 }
const IMAGE_BOX_WITH_IMG: Rect = { x: 290, y: 560, w: 500, h: 560 }

const TITLE_SLOT_WITH_IMG: TextSlotDef = {
  id: 'title',
  box: TITLE_BOX_WITH_IMG,
  fontStack: 'display',
  fontWeight: 800,
  fontSizeMin: 44,
  fontSizeMax: 88, // teto pra titles longos (3 linhas × 88 × 1.05 = 277 ≤ 280)
  lineHeight: 1.05,
  maxLines: 3,
}

const SUBTITLE_SLOT_WITH_IMG: TextSlotDef = {
  id: 'subtitle',
  box: SUBTITLE_BOX_WITH_IMG,
  fontStack: 'body',
  fontWeight: 600,
  fontSizeMin: 24,
  fontSizeMax: 40,
  lineHeight: 1.25,
  maxLines: 3,
}

const IMAGE_MAIN_DEF: ImageSlotDef = {
  id: 'image-main',
  box: IMAGE_BOX_WITH_IMG,
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

function renderCoverTree(args: SubtemplateRenderArgs): React.ReactElement {
  const withImage = hasImageMainSlot(args)
  const titleDef = withImage ? TITLE_SLOT_WITH_IMG : TITLE_SLOT_NO_IMG
  const subtitleDef = withImage ? SUBTITLE_SLOT_WITH_IMG : SUBTITLE_SLOT_NO_IMG

  const titleSlot = args.textSlots.find((s) => s.id === 'title')
  const subtitleSlot = args.textSlots.find((s) => s.id === 'subtitle')
  const titleFontSize = args.resolvedFontSizes.get('title') ?? titleDef.fontSizeMin
  const subtitleFontSize = args.resolvedFontSizes.get('subtitle') ?? subtitleDef.fontSizeMin
  const titleLines = args.resolvedLines.get('title') ?? (titleSlot ? [titleSlot.content] : [])
  const subtitleLines = args.resolvedLines.get('subtitle') ?? (subtitleSlot ? [subtitleSlot.content] : [])

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
            left: titleDef.box.x,
            top: titleDef.box.y,
            width: titleDef.box.w,
            height: titleDef.box.h,
            // BUG-M2-005: center em vez de flex-end evita estouro pra cima
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {renderTextLines({
            lines: titleLines.map((l) => l.toUpperCase()),
            fontWeight: titleDef.fontWeight,
            fontSize: titleFontSize,
            lineHeight: titleDef.lineHeight,
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
            left: subtitleDef.box.x,
            top: subtitleDef.box.y,
            width: subtitleDef.box.w,
            height: subtitleDef.box.h,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {renderTextLines({
            lines: subtitleLines,
            fontWeight: subtitleDef.fontWeight,
            fontSize: subtitleFontSize,
            lineHeight: subtitleDef.lineHeight,
            color: textColor,
            opacity: 0.92,
          })}
        </div>
      )}
    </div>
  )
}

function planHasImageMain(plan: SlidePlan): boolean {
  return plan.imageSlots.some((s) => s.id === 'image-main')
}

export const coverModule: SubtemplateModule = {
  config: {
    id: 'cover',
    // Default usa layout NO-IMG. resolveTextSlotDefs sobrescreve com layout
    // WITH-IMG quando o plan tiver image-main (BUG-M2-004 Fase 6).
    textSlots: [TITLE_SLOT_NO_IMG, SUBTITLE_SLOT_NO_IMG],
    imageSlots: [IMAGE_MAIN_DEF],
    density: 'sparse',
    compatibleBackgrounds: ['*'],
  },
  render: renderCoverTree,
  resolveTextSlotDefs: (plan) =>
    planHasImageMain(plan)
      ? [TITLE_SLOT_WITH_IMG, SUBTITLE_SLOT_WITH_IMG]
      : [TITLE_SLOT_NO_IMG, SUBTITLE_SLOT_NO_IMG],
}

export const COVER_TITLE_DEF = TITLE_SLOT_NO_IMG
export const COVER_SUBTITLE_DEF = SUBTITLE_SLOT_NO_IMG
export const COVER_TITLE_DEF_WITH_IMAGE = TITLE_SLOT_WITH_IMG
export const COVER_SUBTITLE_DEF_WITH_IMAGE = SUBTITLE_SLOT_WITH_IMG

export default coverModule
