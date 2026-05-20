/**
 * V2 Subtemplates — shared helpers (Satori React elements)
 *
 * Os ícones/conectores são passados como data URL pré-resolvidos (compose.ts).
 */

import * as React from 'react'

export const BRAND_CYAN = '#4CDDC3'
export const BRAND_WHITE = '#FEFEFC'
export const BRAND_DARK = '#1A1A1A'
export const BRAND_DEEP_PURPLE = '#1E1B4B'

/** Shadow forte pra texto sobre hero — garante legibilidade independente do conteúdo do hero. */
export const TEXT_SHADOW_HEAVY = '0 2px 12px rgba(0, 0, 0, 0.85), 0 0 4px rgba(0, 0, 0, 0.6)'
export const TEXT_SHADOW_SOFT = '0 1px 4px rgba(0, 0, 0, 0.4)'

interface IconCircleProps {
  url: string
  size?: number
  top: number
  left: number
}

export function IconCircle({ url, size = 96, top, left }: IconCircleProps): React.ReactElement {
  return (
    <img
      src={url}
      width={size}
      height={size}
      style={{ position: 'absolute', top, left }}
    />
  )
}

interface ConnectorImgProps {
  url: string
  width: number
  height: number
  top: number
  left: number
}

export function ConnectorImg({ url, width, height, top, left }: ConnectorImgProps): React.ReactElement {
  return (
    <img
      src={url}
      width={width}
      height={height}
      style={{ position: 'absolute', top, left }}
    />
  )
}

interface TextBlockProps {
  lines: string[]
  fontSize: number
  fontWeight: number
  color: string
  lineHeight?: number
  align?: 'left' | 'center' | 'right'
  letterSpacing?: string
  opacity?: number
  textShadow?: string
}

export function TextBlock({
  lines,
  fontSize,
  fontWeight,
  color,
  lineHeight = 1.05,
  align = 'left',
  letterSpacing = '0',
  opacity = 1,
  textShadow,
}: TextBlockProps): React.ReactElement {
  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: justify,
        width: '100%',
      }}
    >
      {lines.map((ln, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            fontFamily: 'Montserrat',
            fontWeight,
            fontSize,
            lineHeight,
            color,
            opacity,
            textAlign: align,
            justifyContent: justify,
            letterSpacing,
            whiteSpace: 'nowrap',
            ...(textShadow ? { textShadow } : {}),
          }}
        >
          {ln}
        </div>
      ))}
    </div>
  )
}

interface BadgePillProps {
  texto: string
  iconUrl: string
  top: number
  left: number
  fontSize?: number
}

export function BadgePill({ texto, iconUrl, top, left, fontSize = 36 }: BadgePillProps): React.ReactElement {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 24px',
        border: `2px solid ${BRAND_CYAN}`,
        borderRadius: 999,
        // Bg semi-transparente roxo escuro pra contraste com gradient claro/hero.
        background: 'rgba(20, 16, 60, 0.55)',
      }}
    >
      <span
        style={{
          fontFamily: 'Montserrat',
          fontWeight: 800,
          fontSize,
          color: BRAND_CYAN,
          letterSpacing: '0.04em',
        }}
      >
        {texto.toUpperCase()}
      </span>
      <img src={iconUrl} width={fontSize + 12} height={fontSize + 12} />
    </div>
  )
}
