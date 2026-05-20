/**
 * V2 Subtemplate — CAPA-CURTA (V2.0.1)
 *
 * Layout (zone hero = X 110-970, Y 480-860):
 *  - Y 80-400:   título alinhado esquerda
 *  - Y 380-450:  badge sub-tema (abaixo título, NUNCA sobre hero)
 *  - Y 440-540:  bullets TL/TR (acima do hero, fora da zona)
 *  - Y 480-860:  hero (Sharp layer 2)
 *  - Y 880-980:  bullets BL/BR (abaixo do hero, fora da zona)
 *  - Y 1010-1290: card inferior numerado opcional
 *
 * Conectores apontam pros pontos âncora do hero (BUG-V2-003).
 */

import * as React from 'react'
import {
  BRAND_CYAN,
  BRAND_WHITE,
  IconCircle,
  ConnectorImg,
  TextBlock,
  BadgePill,
  TEXT_SHADOW_HEAVY,
} from './_shared'
import { bucketForTitulo, bucketForBullet } from '../text-buckets'
import { wrapText } from '../text-renderer'
import type { V2AssetUrls } from '../icons'
import type { V2Plan } from '../types'
import type { ZoneSpec } from '../zones'

export interface RenderCapaCurtaArgs {
  plan: V2Plan
  assets: V2AssetUrls
  zone: ZoneSpec
}

const ICON_SIZE = 96
const TITLE_MAX_W = 960
const TITLE_MAX_H = 320

// BUG-V2-008: hero ampliado Y 430-970 (540px). Bullets BL/BR ficam DENTRO do hero
// com text-shadow forte (BUG-V2-002 estratégia). TL/TR ficam acima (Y 460 = topo hero).
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
  // TL — ícone topo-esq do hero
  { iconLeft: 40, iconTop: 460, textLeft: 150, textTop: 460, textWidth: 320, textAlign: 'left',
    connector: 'curve-tl', connectorTop: 510, connectorLeft: 130, connectorWidth: 240, connectorHeight: 140 },
  // TR
  { iconLeft: 944, iconTop: 460, textLeft: 610, textTop: 460, textWidth: 320, textAlign: 'right',
    connector: 'curve-tr', connectorTop: 510, connectorLeft: 710, connectorWidth: 240, connectorHeight: 140 },
  // BL — ícone baixo-esq do hero (dentro zona, com text-shadow forte)
  { iconLeft: 40, iconTop: 870, textLeft: 150, textTop: 870, textWidth: 320, textAlign: 'left',
    connector: 'curve-bl', connectorTop: 750, connectorLeft: 130, connectorWidth: 240, connectorHeight: 130 },
  // BR
  { iconLeft: 944, iconTop: 870, textLeft: 610, textTop: 870, textWidth: 320, textAlign: 'right',
    connector: 'curve-br', connectorTop: 750, connectorLeft: 710, connectorWidth: 240, connectorHeight: 130 },
]

export function renderCapaCurta(args: RenderCapaCurtaArgs): React.ReactElement {
  const { plan, assets } = args

  // BUG (V2.0.2 fix): quando há badge, cap fontSize em 110 pra título caber em 2 linhas
  // e deixar espaço pro badge embaixo sem sobrepor literal (viola REGRA #0 se cortar).
  const tituloBucket = bucketForTitulo(plan.titulo.length)
  const tituloFontSize = plan.badgeSubtema
    ? Math.min(tituloBucket.fontSize, 110)
    : tituloBucket.fontSize
  const tituloWrap = wrapText({
    text: plan.titulo.toUpperCase(),
    maxWidthPx: TITLE_MAX_W,
    fontSize: tituloFontSize,
    fontWeight: 800,
    maxHeightPx: TITLE_MAX_H,
    lineHeight: 1.0,
  })

  const bullets = plan.bullets.slice(0, 4)

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

      {/* Badge sub-tema — Y dinâmico baseado em altura REAL do título (sem cap arbitrário) */}
      {plan.badgeSubtema && (
        <BadgePill
          texto={plan.badgeSubtema.texto}
          iconUrl={assets.icons[plan.badgeSubtema.icone]}
          top={80 + tituloWrap.lines.length * tituloWrap.fontSize * 1.0 + 16}
          left={60}
          fontSize={32}
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

      {/* Card inferior opcional — V2.0.3: Y 1000 (após hero ampliado até 970) */}
      {plan.cardInferior && (
        <div
          style={{
            position: 'absolute',
            top: 1000,
            left: 60,
            width: 960,
            minHeight: 230,
            padding: 24,
            borderRadius: 24,
            border: `2px solid ${BRAND_CYAN}`,
            background: 'rgba(20, 16, 60, 0.75)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
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
                fontSize: 38,
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
                  fontSize: 26,
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
