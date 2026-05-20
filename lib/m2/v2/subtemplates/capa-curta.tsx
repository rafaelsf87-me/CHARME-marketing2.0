/**
 * V2 Subtemplate — CAPA-CURTA
 *
 * Layout (1080×1350): título topo-esquerda + badge + 4 ícones+conectores
 * em volta + hero centro (Sharp) + card inferior numerado opcional.
 */

import * as React from 'react'
import {
  BRAND_CYAN,
  BRAND_WHITE,
  IconCircle,
  ConnectorImg,
  TextBlock,
  BadgePill,
} from './_shared'
import { bucketForTitulo, bucketForBullet } from '../text-buckets'
import { wrapText } from '../text-renderer'
import type { V2AssetUrls } from '../icons'
import type { V2Plan } from '../types'

export interface RenderCapaCurtaArgs {
  plan: V2Plan
  assets: V2AssetUrls
}

const ICON_SIZE = 96
const TITLE_MAX_W = 960
const TITLE_MAX_H = 380

const CORNERS: Array<{
  iconLeft: number
  iconTop: number
  textLeft: number
  textTop: number
  textWidth: number
  textAlign: 'left' | 'right'
  connector: 'curve-tl' | 'curve-tr' | 'curve-bl' | 'curve-br'
  connectorTop: number
  connectorLeft: number
  connectorWidth: number
  connectorHeight: number
}> = [
  // TL
  { iconLeft: 60, iconTop: 460, textLeft: 170, textTop: 460, textWidth: 320, textAlign: 'left',
    connector: 'curve-tl', connectorTop: 560, connectorLeft: 130, connectorWidth: 380, connectorHeight: 200 },
  // TR
  { iconLeft: 924, iconTop: 460, textLeft: 590, textTop: 460, textWidth: 320, textAlign: 'right',
    connector: 'curve-tr', connectorTop: 560, connectorLeft: 570, connectorWidth: 380, connectorHeight: 200 },
  // BL
  { iconLeft: 60, iconTop: 950, textLeft: 170, textTop: 950, textWidth: 320, textAlign: 'left',
    connector: 'curve-bl', connectorTop: 800, connectorLeft: 130, connectorWidth: 380, connectorHeight: 180 },
  // BR
  { iconLeft: 924, iconTop: 950, textLeft: 590, textTop: 950, textWidth: 320, textAlign: 'right',
    connector: 'curve-br', connectorTop: 800, connectorLeft: 570, connectorWidth: 380, connectorHeight: 180 },
]

export function renderCapaCurta(args: RenderCapaCurtaArgs): React.ReactElement {
  const { plan, assets } = args

  const tituloBucket = bucketForTitulo(plan.titulo.length)
  const tituloWrap = wrapText({
    text: plan.titulo.toUpperCase(),
    maxWidthPx: TITLE_MAX_W,
    fontSize: tituloBucket.fontSize,
    fontWeight: 800,
    maxHeightPx: TITLE_MAX_H,
    lineHeight: 1.0,
  })

  const bullets = plan.bullets.slice(0, 4)

  return (
    <div style={{ position: 'relative', width: 1080, height: 1350, display: 'flex' }}>
      {/* Título topo-esquerda */}
      <div style={{ position: 'absolute', top: 80, left: 60, width: TITLE_MAX_W, display: 'flex' }}>
        <TextBlock
          lines={tituloWrap.lines}
          fontSize={tituloWrap.fontSize}
          fontWeight={800}
          color={BRAND_CYAN}
          align="left"
          lineHeight={1.0}
          letterSpacing="-0.01em"
        />
      </div>

      {/* Badge sub-tema (opcional) */}
      {plan.badgeSubtema && (
        <BadgePill
          texto={plan.badgeSubtema.texto}
          iconUrl={assets.icons[plan.badgeSubtema.icone]}
          top={80 + tituloWrap.lines.length * tituloWrap.fontSize * 1.0 + 20}
          left={60}
          fontSize={42}
        />
      )}

      {/* Bullets + ícones + conectores */}
      {bullets.map((b, idx) => {
        const corner = CORNERS[idx]
        if (!corner) return null
        const bulletBucket = bucketForBullet(b.texto.length)
        const wrap = wrapText({
          text: b.texto,
          maxWidthPx: corner.textWidth,
          fontSize: bulletBucket.fontSize,
          fontWeight: 700,
          maxHeightPx: 200,
          lineHeight: 1.15,
        })
        return (
          <React.Fragment key={idx}>
            <ConnectorImg
              url={assets.connectors[corner.connector]}
              width={corner.connectorWidth}
              height={corner.connectorHeight}
              top={corner.connectorTop}
              left={corner.connectorLeft}
            />
            <IconCircle
              url={assets.icons[b.icone]}
              size={ICON_SIZE}
              top={corner.iconTop}
              left={corner.iconLeft}
            />
            <div
              style={{
                position: 'absolute',
                top: corner.textTop,
                left: corner.textLeft,
                width: corner.textWidth,
                display: 'flex',
              }}
            >
              <TextBlock
                lines={wrap.lines}
                fontSize={wrap.fontSize}
                fontWeight={700}
                color={BRAND_WHITE}
                align={corner.textAlign}
                lineHeight={1.15}
              />
            </div>
          </React.Fragment>
        )
      })}

      {/* Card inferior opcional */}
      {plan.cardInferior && (
        <div
          style={{
            position: 'absolute',
            top: 1060,
            left: 60,
            width: 960,
            minHeight: 220,
            padding: 32,
            borderRadius: 24,
            border: `2px solid ${BRAND_CYAN}`,
            background: 'rgba(20, 16, 60, 0.55)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {plan.cardInferior.numero && (
              <div
                style={{
                  display: 'flex',
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  background: BRAND_CYAN,
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Montserrat',
                  fontWeight: 800,
                  fontSize: 32,
                  color: '#1A1A1A',
                }}
              >
                {plan.cardInferior.numero}
              </div>
            )}
            <span
              style={{
                fontFamily: 'Montserrat',
                fontWeight: 800,
                fontSize: 40,
                color: BRAND_WHITE,
              }}
            >
              {plan.cardInferior.titulo}
            </span>
          </div>
          {plan.cardInferior.bullets.map((bullet, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: BRAND_CYAN,
                }}
              />
              <span
                style={{
                  fontFamily: 'Montserrat',
                  fontWeight: 600,
                  fontSize: 28,
                  color: BRAND_WHITE,
                  opacity: 0.95,
                }}
              >
                {bullet}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
