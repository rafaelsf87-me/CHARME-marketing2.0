/**
 * V2 Subtemplate — CAPA-LONGA
 *
 * Layout (1080×1350): ícone topo central + título underline + 2-3 bullets
 * verticais à esquerda com conector pontilhado + hero direita (Sharp) +
 * card inferior longa (2 colunas).
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

export interface RenderCapaLongaArgs {
  plan: V2Plan
  assets: V2AssetUrls
}

const ICON_TOPO_SIZE = 96
const BULLET_ICON_SIZE = 84
const TITLE_MAX_W = 960
const TITLE_MAX_H = 520

export function renderCapaLonga(args: RenderCapaLongaArgs): React.ReactElement {
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

  const bullets = plan.bullets.slice(0, 3)
  const iconTopo = plan.iconeTopo ?? 'casa-coracao'

  const bulletYs =
    bullets.length === 3 ? [740, 870, 1000] : bullets.length === 2 ? [760, 920] : [820]

  return (
    <div style={{ position: 'relative', width: 1080, height: 1350, display: 'flex' }}>
      {/* Ícone topo central */}
      <IconCircle
        url={assets.icons[iconTopo]}
        size={ICON_TOPO_SIZE}
        top={60}
        left={(1080 - ICON_TOPO_SIZE) / 2}
      />

      {/* Título + underline */}
      <div
        style={{
          position: 'absolute',
          top: 180,
          left: 60,
          width: TITLE_MAX_W,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <TextBlock
          lines={tituloWrap.lines}
          fontSize={tituloWrap.fontSize}
          fontWeight={800}
          color={BRAND_CYAN}
          align="left"
          lineHeight={1.0}
          letterSpacing="-0.01em"
        />
        <div style={{ display: 'flex', width: 280, height: 4, background: BRAND_CYAN, borderRadius: 2 }} />
      </div>

      {/* Conector pontilhado vertical (≥2 bullets) */}
      {bullets.length >= 2 && (
        <ConnectorImg
          url={assets.connectors['dotted-vertical']}
          width={20}
          height={bulletYs[bullets.length - 1] - bulletYs[0]}
          top={bulletYs[0] + BULLET_ICON_SIZE}
          left={60 + BULLET_ICON_SIZE / 2 - 10}
        />
      )}

      {/* Bullets verticais */}
      {bullets.map((b, idx) => {
        const y = bulletYs[idx]
        const bulletBucket = bucketForBullet(b.texto.length)
        const wrap = wrapText({
          text: b.texto,
          maxWidthPx: 380,
          fontSize: bulletBucket.fontSize,
          fontWeight: 700,
          maxHeightPx: 130,
          lineHeight: 1.15,
        })
        return (
          <React.Fragment key={idx}>
            <IconCircle url={assets.icons[b.icone]} size={BULLET_ICON_SIZE} top={y} left={60} />
            <div
              style={{
                position: 'absolute',
                top: y + 6,
                left: 60 + BULLET_ICON_SIZE + 24,
                width: 380,
                display: 'flex',
              }}
            >
              <TextBlock
                lines={wrap.lines}
                fontSize={wrap.fontSize}
                fontWeight={700}
                color={BRAND_WHITE}
                align="left"
                lineHeight={1.15}
              />
            </div>
          </React.Fragment>
        )
      })}

      {/* Card inferior longa */}
      {plan.cardInferiorLonga && (
        <div
          style={{
            position: 'absolute',
            top: 1060,
            left: 60,
            width: 960,
            minHeight: 220,
            padding: 28,
            borderRadius: 24,
            border: `2px solid ${BRAND_CYAN}`,
            background: 'rgba(20, 16, 60, 0.55)',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
            <IconCircle url={assets.icons[plan.cardInferiorLonga.icone]} size={84} top={0} left={0} />
            <span
              style={{
                fontFamily: 'Montserrat',
                fontWeight: 600,
                fontSize: 26,
                color: BRAND_WHITE,
                lineHeight: 1.25,
                width: 460,
              }}
            >
              {plan.cardInferiorLonga.textoLongo}
            </span>
          </div>
          <div style={{ display: 'flex', width: 320 }}>
            <span
              style={{
                fontFamily: 'Montserrat',
                fontWeight: 800,
                fontSize: 34,
                color: BRAND_CYAN,
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
              }}
            >
              {plan.cardInferiorLonga.destaque.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
