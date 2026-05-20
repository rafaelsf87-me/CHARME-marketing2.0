/**
 * V2 Subtemplate — CAPA-LONGA (V2.0.1)
 *
 * Layout (BUG-V2-002 — texto esquerda 60%, hero direita 40%):
 *  - X 0-580: zona de texto (título + bullets + ícone topo)
 *  - X 580-1020: hero zone (Sharp layer 2)
 *
 *  - Y 60-160:    ícone topo central
 *  - Y 180-700:   título alinhado esquerda
 *  - Y 760-980:   2 bullets verticais à esquerda + conector pontilhado vertical
 *  - Y 1020-1290: card inferior 2 colunas (full width, sobrepõe base do hero
 *                 com bg translúcido — aceitável conforme referência print 2)
 */

import * as React from 'react'
import {
  BRAND_CYAN,
  BRAND_WHITE,
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

export interface RenderCapaLongaArgs {
  plan: V2Plan
  assets: V2AssetUrls
  zone: ZoneSpec
}

const ICON_TOPO_SIZE = 96
const BULLET_ICON_SIZE = 84
const TITLE_MAX_W = 540 // 60% lateral esquerda
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

  // BUG-V2-006: Y reduzido pra reservar espaço pro card inferior (Y 1060+).
  // 2 bullets max ocupam Y 720-960. 3 bullets ocupam Y 700-980.
  const bulletYs =
    bullets.length === 3 ? [700, 830, 960] : bullets.length === 2 ? [720, 870] : [780]

  return (
    <div style={{ position: 'relative', width: 1080, height: 1350, display: 'flex' }}>
      {/* Ícone topo (esquerda — lado do texto) */}
      <IconCircle
        url={assets.icons[iconTopo]}
        size={ICON_TOPO_SIZE}
        top={60}
        left={40}
      />

      {/* Título + underline (esquerda) */}
      <div
        style={{
          position: 'absolute',
          top: 180,
          left: 40,
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
          textShadow={TEXT_SHADOW_HEAVY}
        />
        <div style={{ display: 'flex', width: 240, height: 4, background: BRAND_CYAN, borderRadius: 2 }} />
      </div>

      {/* Conector pontilhado vertical entre bullets (≥2 bullets) */}
      {bullets.length >= 2 && (
        <ConnectorImg
          url={assets.connectors['dotted-vertical']}
          width={20}
          height={bulletYs[bullets.length - 1] - bulletYs[0]}
          top={bulletYs[0] + BULLET_ICON_SIZE}
          left={40 + BULLET_ICON_SIZE / 2 - 10}
        />
      )}

      {/* Bullets verticais esquerda — BUG-V2-006: cap font em 26px pra evitar overflow no card */}
      {bullets.map((b, idx) => {
        const y = bulletYs[idx]
        const bulletBucket = bucketForBullet(b.texto.length)
        const fontSize = Math.min(bulletBucket.fontSize, 26)
        const wrap = wrapText({
          text: b.texto,
          maxWidthPx: 380,
          fontSize,
          fontWeight: 700,
          maxHeightPx: 110,
          lineHeight: 1.15,
        })
        return (
          <React.Fragment key={idx}>
            <IconCircle url={assets.icons[b.icone]} size={BULLET_ICON_SIZE} top={y} left={40} />
            <div
              style={{
                position: 'absolute',
                top: y + 6,
                left: 40 + BULLET_ICON_SIZE + 24,
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
                textShadow={TEXT_SHADOW_HEAVY}
              />
            </div>
          </React.Fragment>
        )
      })}

      {/* Card inferior longa — BUG-V2-006: altura dinâmica + auto-shrink font */}
      {plan.cardInferiorLonga && (() => {
        // Auto-fit do texto longo: começa em 22, shrink se >170 chars
        const textoLongoLen = plan.cardInferiorLonga.textoLongo.length
        const fontTextoLongo = textoLongoLen > 170 ? 18 : textoLongoLen > 130 ? 20 : 22
        const destaqueLen = plan.cardInferiorLonga.destaque.length
        const fontDestaque = destaqueLen > 30 ? 24 : destaqueLen > 22 ? 28 : 32
        return (
          <div
            style={{
              position: 'absolute',
              top: 1060,
              left: 40,
              width: 1000,
              height: 270, // espaço reservado fixo (1060→1330)
              padding: 22,
              borderRadius: 24,
              border: `2px solid ${BRAND_CYAN}`,
              background: 'rgba(20, 16, 60, 0.82)',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1 }}>
              <IconCircle url={assets.icons[plan.cardInferiorLonga.icone]} size={76} top={0} left={0} />
              <span
                style={{
                  fontFamily: 'Montserrat',
                  fontWeight: 600,
                  fontSize: fontTextoLongo,
                  color: BRAND_WHITE,
                  lineHeight: 1.25,
                  width: 480,
                  overflow: 'hidden',
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
                  fontSize: fontDestaque,
                  color: BRAND_CYAN,
                  lineHeight: 1.1,
                  letterSpacing: '-0.01em',
                }}
              >
                {plan.cardInferiorLonga.destaque.toUpperCase()}
              </span>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
