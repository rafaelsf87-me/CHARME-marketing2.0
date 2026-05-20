/**
 * V2 Subtemplate — CTA-FINAL (V2.0.1)
 *
 * Base = CAPA-CURTA. Modificações:
 *  - Bullets só TL/TR (máx 2 — sem BL/BR)
 *  - Sem card inferior numerado
 *  - Botão CTA central rodapé: pílula AZUL ESCURO (#1E1B4B) + texto BRANCO (BUG-V2-005)
 *  - Footer @charmedodetalhe + logo (única slide com footer — invariante)
 *
 * Layout:
 *  - Y 80-380:   título
 *  - Y 440-540:  bullets TL/TR
 *  - Y 480-860:  hero (Sharp layer 2)
 *  - Y 920-1020: botão CTA
 *  - Y 1230-1300: footer logo + handle
 */

import * as React from 'react'
import {
  BRAND_CYAN,
  BRAND_WHITE,
  BRAND_DEEP_PURPLE,
  IconCircle,
  ConnectorImg,
  TextBlock,
  TEXT_SHADOW_HEAVY,
} from './_shared'
import { bucketForTitulo, bucketForBullet } from '../text-buckets'
import { wrapText } from '../text-renderer'
import type { V2AssetUrls } from '../icons'
import type { V2Plan } from '../types'
import type { ZoneSpec } from '../zones'

export interface RenderCtaFinalArgs {
  plan: V2Plan
  assets: V2AssetUrls
  zone: ZoneSpec
  footerLogoUrl: string
  footerHandle: string
}

const ICON_SIZE = 96
const TITLE_MAX_W = 960
const TITLE_MAX_H = 280

// BUG-V2-005: fundo #1E1B4B (azul escuro) + texto branco. NÃO ciano.
const CTA_BG = BRAND_DEEP_PURPLE
const CTA_TEXT_COLOR = '#FFFFFF'

const TOP_CORNERS = [
  { iconLeft: 40, iconTop: 440, textLeft: 150, textTop: 440, textWidth: 320,
    textAlign: 'left' as const, connector: 'curve-tl' as const,
    connectorTop: 480, connectorLeft: 130, connectorWidth: 260, connectorHeight: 140 },
  { iconLeft: 944, iconTop: 440, textLeft: 610, textTop: 440, textWidth: 320,
    textAlign: 'right' as const, connector: 'curve-tr' as const,
    connectorTop: 480, connectorLeft: 690, connectorWidth: 260, connectorHeight: 140 },
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

      {/* Bullets TL/TR */}
      {bullets.map((b, idx) => {
        const corner = TOP_CORNERS[idx]
        if (!corner) return null
        const bulletBucket = bucketForBullet(b.texto.length)
        const wrap = wrapText({
          text: b.texto,
          maxWidthPx: corner.textWidth,
          fontSize: bulletBucket.fontSize,
          fontWeight: 700,
          maxHeightPx: 140,
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
                top: corner.textTop + 12,
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
                textShadow={TEXT_SHADOW_HEAVY}
              />
            </div>
          </React.Fragment>
        )
      })}

      {/* Botão CTA central — BUG-V2-005: bg #1E1B4B + texto branco */}
      <div
        style={{
          position: 'absolute',
          top: 940,
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
            maxWidth: 920,
          }}
        >
          <span
            style={{
              fontFamily: 'Montserrat',
              fontWeight: 800,
              fontSize: 30,
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
