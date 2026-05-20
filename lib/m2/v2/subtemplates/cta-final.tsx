/**
 * V2 Subtemplate — CTA-FINAL
 *
 * Base = CAPA-CURTA visual + botão CTA central + footer.
 * Footer renderizado inline (logo via data URL pré-resolvido).
 */

import * as React from 'react'
import {
  BRAND_CYAN,
  BRAND_WHITE,
  IconCircle,
  ConnectorImg,
  TextBlock,
} from './_shared'
import { bucketForTitulo, bucketForBullet } from '../text-buckets'
import { wrapText } from '../text-renderer'
import type { V2AssetUrls } from '../icons'
import type { V2Plan } from '../types'

export interface RenderCtaFinalArgs {
  plan: V2Plan
  assets: V2AssetUrls
  footerLogoUrl: string
  footerHandle: string
}

const ICON_SIZE = 96
const TITLE_MAX_W = 960
const TITLE_MAX_H = 240
const CTA_BG = BRAND_CYAN
const CTA_TEXT_COLOR = '#1A1A1A'

const TOP_CORNERS = [
  { iconLeft: 60, iconTop: 440, textLeft: 170, textTop: 440, textWidth: 320,
    textAlign: 'left' as const, connector: 'curve-tl' as const, connectorTop: 540, connectorLeft: 130 },
  { iconLeft: 924, iconTop: 440, textLeft: 590, textTop: 440, textWidth: 320,
    textAlign: 'right' as const, connector: 'curve-tr' as const, connectorTop: 540, connectorLeft: 570 },
]

export function renderCtaFinal(args: RenderCtaFinalArgs): React.ReactElement {
  const { plan, assets, footerLogoUrl, footerHandle } = args

  const tituloBucket = bucketForTitulo(plan.titulo.length)
  const tituloWrap = wrapText({
    text: plan.titulo.toUpperCase(),
    maxWidthPx: TITLE_MAX_W,
    fontSize: tituloBucket.fontSize,
    fontWeight: 800,
    maxHeightPx: TITLE_MAX_H,
    lineHeight: 1.0,
  })

  const bullets = plan.bullets.slice(0, 2)
  const ctaTexto = plan.ctaButtonTexto ?? 'Gostou? Compartilha para informar as amigas!'

  return (
    <div style={{ position: 'relative', width: 1080, height: 1350, display: 'flex' }}>
      {/* Título */}
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

      {/* Bullets topo (máx 2) */}
      {bullets.map((b, idx) => {
        const corner = TOP_CORNERS[idx]
        if (!corner) return null
        const bulletBucket = bucketForBullet(b.texto.length)
        const wrap = wrapText({
          text: b.texto,
          maxWidthPx: corner.textWidth,
          fontSize: bulletBucket.fontSize,
          fontWeight: 700,
          maxHeightPx: 160,
          lineHeight: 1.15,
        })
        return (
          <React.Fragment key={idx}>
            <ConnectorImg
              url={assets.connectors[corner.connector]}
              width={380}
              height={200}
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

      {/* Botão CTA central */}
      <div
        style={{
          position: 'absolute',
          top: 1000,
          left: 60,
          width: 960,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            padding: '20px 36px',
            background: CTA_BG,
            borderRadius: 999,
            maxWidth: 880,
          }}
        >
          <span
            style={{
              fontFamily: 'Montserrat',
              fontWeight: 800,
              fontSize: 32,
              color: CTA_TEXT_COLOR,
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            {ctaTexto}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          top: 1230,
          left: 0,
          width: 1080,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <img src={footerLogoUrl} height={56} />
        <span
          style={{
            fontFamily: 'Montserrat',
            fontWeight: 700,
            fontSize: 28,
            color: BRAND_CYAN,
          }}
        >
          {footerHandle}
        </span>
      </div>
    </div>
  )
}
