import type { M3Cores, M3Condicao, M3Textos } from '../../types'

// Layout SVG via Satori — Mobile 800×600, Template Atual_Maio26.
// Coordenadas conforme SPEC v1.8 §"Layout pixel-preciso — Mobile".
// Renderiza: waves brancas, card compacto, círculo desconto (sobreposto ao
// MÃE do título à direita), footer 2 linhas alinhado à esquerda, speed lines.
// NÃO renderiza: BG gradient, título, atriz, decorações, ícones (Sharp).

const W = 800
const H = 600

// Card compacto (grid 2×2)
const CARD_X = 30
const CARD_Y = 295
const CARD_W = 480
const CARD_H = 240
const CARD_RX = 24
const CARD_DIV_X = CARD_X + CARD_W / 2 // vertical no meio
const CARD_DIV_Y = CARD_Y + CARD_H / 2 // horizontal no meio
const Q_W = CARD_W / 2 // 240
const Q_H = CARD_H / 2 // 120

// Círculo do desconto (sobre MÃE)
const CIRC_CX = 420
const CIRC_CY = 190
const CIRC_R = 95

// Footer asterisco (2 linhas alinhadas esquerda)
const FOOTER_X = 30
const FOOTER_Y1 = 565
const FOOTER_Y2 = 585

const FONT = 'Montserrat'

export interface LayoutMobileProps {
  cores: M3Cores
  textos: M3Textos
  condicoes: M3Condicao[] // até 4
  // Footer mobile pode ser quebrado em 2 linhas pra alinhar à esquerda.
  // Se vier única string, divide em 2 partes proporcionais.
  footerLinhas?: [string, string]
}

// Satori v0.11 exige `display: flex` em todo <div> — auto-injeta se faltar.
type Node = { type: string; props: Record<string, unknown> }
function el(type: string, props: Record<string, unknown> = {}, ...children: unknown[]): Node {
  let finalProps = props
  if (type === 'div') {
    const style = (props.style as Record<string, unknown>) ?? {}
    if (style.display === undefined) {
      finalProps = { ...props, style: { ...style, display: 'flex' } }
    }
  }
  return { type, props: { ...finalProps, children: children.length === 1 ? children[0] : children } }
}

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

function backgroundDecorSvg(): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <path d="M0,40 Q200,80 400,40 T800,40 L800,0 L0,0 Z" fill="white" opacity="0.07"/>
  <path d="M0,260 Q200,300 400,260 T800,260" fill="none" stroke="white" stroke-width="2" opacity="0.08"/>
  <path d="M0,540 Q200,580 400,540 T800,540 L800,600 L0,600 Z" fill="white" opacity="0.06"/>
  <line x1="20" y1="490" x2="80" y2="510" stroke="white" stroke-width="2" opacity="0.5"/>
  <line x1="30" y1="520" x2="100" y2="535" stroke="white" stroke-width="2" opacity="0.4"/>
  <line x1="550" y1="80" x2="610" y2="100" stroke="white" stroke-width="2" opacity="0.5"/>
  <line x1="520" y1="110" x2="600" y2="135" stroke="white" stroke-width="2" opacity="0.4"/>
</svg>
  `.trim()
}

function discCircleSvg(cores: M3Cores): string {
  const pad = 6
  const size = CIRC_R * 2 + pad * 2
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="g" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${cores.secondary}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${cores.primary}"/>
    </radialGradient>
  </defs>
  <circle cx="${size / 2}" cy="${size / 2}" r="${CIRC_R}" fill="url(#g)" stroke="${cores.secondary}" stroke-width="3"/>
</svg>
  `.trim()
}

export function buildLayoutMobileTree({ cores, textos, condicoes, footerLinhas }: LayoutMobileProps): Node {
  const slots = [
    { x: CARD_X, y: CARD_Y, w: Q_W, h: Q_H },
    { x: CARD_DIV_X, y: CARD_Y, w: Q_W, h: Q_H },
    { x: CARD_X, y: CARD_DIV_Y, w: Q_W, h: Q_H },
    { x: CARD_DIV_X, y: CARD_DIV_Y, w: Q_W, h: Q_H },
  ]

  const quadrantes = slots.slice(0, condicoes.length).map((slot, idx) => {
    const cond = condicoes[idx]
    return el(
      'div',
      {
        style: {
          position: 'absolute',
          left: slot.x,
          top: slot.y,
          width: slot.w,
          height: slot.h,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: 8,
          paddingTop: 60, // reserva pro ícone
        },
      },
      ...cond.textos.map((linha, i) =>
        el(
          'div',
          {
            style: {
              fontFamily: FONT,
              fontWeight: i === 0 ? 800 : 600,
              fontSize: i === 0 ? 14 : 11,
              color: cores.accent,
              textAlign: 'center',
              lineHeight: 1.15,
              maxWidth: slot.w - 16,
            },
          },
          linha,
        ),
      ),
    )
  })

  const footers: Node[] = footerLinhas
    ? footerLinhas.map((linha, idx) =>
        el(
          'div',
          {
            style: {
              position: 'absolute',
              left: FOOTER_X,
              top: idx === 0 ? FOOTER_Y1 : FOOTER_Y2,
              width: W - FOOTER_X * 2,
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 14,
              color: 'white',
              display: 'flex',
            },
          },
          linha,
        ),
      )
    : textos.footer
    ? [
        el(
          'div',
          {
            style: {
              position: 'absolute',
              left: FOOTER_X,
              top: FOOTER_Y1,
              width: W - FOOTER_X * 2,
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 14,
              color: 'white',
              display: 'flex',
            },
          },
          textos.footer,
        ),
      ]
    : []

  return el(
    'div',
    {
      style: {
        position: 'relative',
        width: W,
        height: H,
        display: 'flex',
        background: 'transparent',
      },
    },
    el('img', {
      src: svgDataUri(backgroundDecorSvg()),
      width: W,
      height: H,
      style: { position: 'absolute', left: 0, top: 0 },
    }),

    el('div', {
      style: {
        position: 'absolute',
        left: CARD_X,
        top: CARD_Y,
        width: CARD_W,
        height: CARD_H,
        background: `linear-gradient(135deg, ${cores.cardBg} 0%, ${cores.cardBgEnd} 100%)`,
        border: `2px solid ${cores.accent}`,
        borderRadius: CARD_RX,
        display: 'flex',
      },
    }),
    el('div', {
      style: {
        position: 'absolute',
        left: CARD_DIV_X - 0.75,
        top: CARD_Y + 16,
        width: 1.5,
        height: CARD_H - 32,
        background: cores.accent,
        opacity: 0.3,
      },
    }),
    el('div', {
      style: {
        position: 'absolute',
        left: CARD_X + 16,
        top: CARD_DIV_Y - 0.75,
        width: CARD_W - 32,
        height: 1.5,
        background: cores.accent,
        opacity: 0.3,
      },
    }),

    ...quadrantes,

    el('img', {
      src: svgDataUri(discCircleSvg(cores)),
      width: CIRC_R * 2 + 12,
      height: CIRC_R * 2 + 12,
      style: { position: 'absolute', left: CIRC_CX - CIRC_R - 6, top: CIRC_CY - CIRC_R - 6 },
    }),
    // "Até" — whiteSpace nowrap pra prevenir wrap acidental
    el(
      'div',
      {
        style: {
          position: 'absolute',
          left: CIRC_CX - 80,
          top: CIRC_CY - 50,
          width: 160,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 22,
          color: 'white',
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          whiteSpace: 'nowrap',
        },
      },
      'Até',
    ),
    // Desconto — width expandido 180→220 + fontSize 40→34 + nowrap.
    // Causa do glitch v1: "38% OFF" não cabia em width 180 com fontSize 40,
    // Satori quebrou em "38%\nOFF" e linhas se sobrepuseram com lineHeight 1.
    el(
      'div',
      {
        style: {
          position: 'absolute',
          left: CIRC_CX - 110,
          top: CIRC_CY - 18,
          width: 220,
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 34,
          color: 'white',
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        },
      },
      textos.descontoPromo,
    ),
    ...(textos.naLojaToda
      ? [
          el(
            'div',
            {
              style: {
                position: 'absolute',
                left: CIRC_CX - 80,
                top: CIRC_CY + 30,
                width: 160,
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: 13,
                color: 'white',
                fontStyle: 'italic',
                textAlign: 'center',
                display: 'flex',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
              },
            },
            'na loja toda',
          ),
        ]
      : []),

    ...footers,
  )
}

export const LAYOUT_MOBILE_DIMENSIONS = { width: W, height: H } as const

export const ICONE_CARD_POSICOES_MOBILE = [
  { cx: CARD_X + Q_W / 2, cy: CARD_Y + 38 },
  { cx: CARD_DIV_X + Q_W / 2, cy: CARD_Y + 38 },
  { cx: CARD_X + Q_W / 2, cy: CARD_DIV_Y + 38 },
  { cx: CARD_DIV_X + Q_W / 2, cy: CARD_DIV_Y + 38 },
] as const
export const ICONE_CARD_SIZE_MOBILE = 50
