import type { M3Cores, M3Condicao, M3Textos } from '../../types'

// Layout SVG via Satori — Desktop 1920×550, Template Atual_Maio26.
// Coordenadas conforme SPEC v1.8 §"Layout pixel-preciso — Desktop".
// O componente renderiza APENAS o que é determinístico: waves brancas,
// card de condições (retângulo + divisores + textos), círculo de desconto
// com textos, footer asterisco. NÃO renderiza: BG gradient (Sharp faz antes),
// título, atriz, decorações, ícones do card (todos via Sharp composite depois).
//
// Trees de Satori usam React-like JSX mas via createElement programático pra
// evitar dependência de pragma JSX em script-level. M4 segue mesmo padrão.

const W = 1920
const H = 550

// Card de condições
const CARD_X = 800
const CARD_Y = 90
const CARD_W = 600
const CARD_H = 380
const CARD_RX = 36
const CARD_DIV_X = 1100 // divisor vertical
const CARD_DIV_Y = 280  // divisor horizontal
// Quadrantes (290×175 cada)
const Q_W = 290
const Q_H = 175
const Q_LEFT_X = CARD_X      // 800
const Q_RIGHT_X = CARD_DIV_X // 1100
const Q_TOP_Y = CARD_Y       // 90
const Q_BOT_Y = CARD_DIV_Y   // 280

// Círculo do desconto
const CIRC_CX = 675
const CIRC_CY = 445
const CIRC_R = 115

// Footer asterisco
const FOOTER_Y = 525

const FONT = 'Montserrat'

export interface LayoutDesktopProps {
  cores: M3Cores
  textos: M3Textos
  condicoes: M3Condicao[] // até 4
}

// Helper pra construir tree Satori sem JSX runtime.
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

// SVG inline (com base64) renderiza melhor em Satori que <path>. As waves
// brancas e o gradient do círculo viram um SVG completo embedded como
// data URI dentro de uma <img>, pra não conflitar com o engine de layout.
function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

function backgroundDecorSvg(): string {
  // 3 waves brancas com opacity baixa (6-10%), espalhadas no canvas.
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <path d="M0,80 Q480,160 960,80 T1920,80 L1920,0 L0,0 Z" fill="white" opacity="0.07"/>
  <path d="M0,280 Q480,360 960,280 T1920,280" fill="none" stroke="white" stroke-width="2" opacity="0.08"/>
  <path d="M0,480 Q480,560 960,480 T1920,480 L1920,550 L0,550 Z" fill="white" opacity="0.06"/>
</svg>
  `.trim()
}

function discCircleSvg(cores: M3Cores): string {
  // Círculo com radial gradient e stroke. Tamanho exato do círculo +
  // padding pra não cortar stroke.
  const pad = 8
  const size = CIRC_R * 2 + pad * 2
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="g" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${cores.secondary}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${cores.primary}"/>
    </radialGradient>
  </defs>
  <circle cx="${size / 2}" cy="${size / 2}" r="${CIRC_R}" fill="url(#g)" stroke="${cores.secondary}" stroke-width="4"/>
</svg>
  `.trim()
}

export function buildLayoutDesktopTree({ cores, textos, condicoes }: LayoutDesktopProps): Node {
  // Quadrantes do card — distribui as primeiras 4 condições nos slots TL TR BL BR.
  // Cada quadrante renderiza só o TEXTO (multilinha); ícones entram via Sharp
  // composite depois.
  const slots = [
    { x: Q_LEFT_X, y: Q_TOP_Y, w: Q_W, h: Q_H },   // TL
    { x: Q_RIGHT_X, y: Q_TOP_Y, w: Q_W, h: Q_H },  // TR
    { x: Q_LEFT_X, y: Q_BOT_Y, w: Q_W, h: Q_H },   // BL
    { x: Q_RIGHT_X, y: Q_BOT_Y, w: Q_W, h: Q_H },  // BR
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
          justifyContent: 'flex-end', // texto no rodapé do quadrante (ícone fica no topo via Sharp)
          alignItems: 'center',
          padding: 12,
          paddingTop: 90, // reserva pro ícone (top half)
        },
      },
      ...cond.textos.map((linha, i) =>
        el(
          'div',
          {
            style: {
              fontFamily: FONT,
              fontWeight: i === 0 ? 800 : 600,
              fontSize: i === 0 ? 18 : 13,
              color: cores.accent,
              textAlign: 'center',
              lineHeight: 1.15,
              maxWidth: slot.w - 24,
            },
          },
          linha,
        ),
      ),
    )
  })

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
    // Waves brancas decorativas no canvas inteiro
    el('img', {
      src: svgDataUri(backgroundDecorSvg()),
      width: W,
      height: H,
      style: { position: 'absolute', left: 0, top: 0 },
    }),

    // Card retangular (gradient cardBg → cardBgEnd) com stroke
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
    // Divisor vertical do card
    el('div', {
      style: {
        position: 'absolute',
        left: CARD_DIV_X - 0.75,
        top: CARD_Y + 20,
        width: 1.5,
        height: CARD_H - 40,
        background: cores.accent,
        opacity: 0.3,
      },
    }),
    // Divisor horizontal do card
    el('div', {
      style: {
        position: 'absolute',
        left: CARD_X + 20,
        top: CARD_DIV_Y - 0.75,
        width: CARD_W - 40,
        height: 1.5,
        background: cores.accent,
        opacity: 0.3,
      },
    }),

    // Quadrantes (4 textos das condições)
    ...quadrantes,

    // Círculo do desconto (SVG embedded)
    el('img', {
      src: svgDataUri(discCircleSvg(cores)),
      width: CIRC_R * 2 + 16,
      height: CIRC_R * 2 + 16,
      style: { position: 'absolute', left: CIRC_CX - CIRC_R - 8, top: CIRC_CY - CIRC_R - 8 },
    }),
    // "Até" — fontSize reduzido 32→26 pra caber dentro do círculo
    el(
      'div',
      {
        style: {
          position: 'absolute',
          left: CIRC_CX - 100,
          top: CIRC_CY - 55,
          width: 200,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 26,
          color: 'white',
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          whiteSpace: 'nowrap',
        },
      },
      'Até',
    ),
    // Desconto principal (ex.: "38% OFF") — fontSize reduzido 52→42
    el(
      'div',
      {
        style: {
          position: 'absolute',
          left: CIRC_CX - 130,
          top: CIRC_CY - 22,
          width: 260,
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: 42,
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
    // "na loja toda" — fontSize reduzido 22→16
    ...(textos.naLojaToda
      ? [
          el(
            'div',
            {
              style: {
                position: 'absolute',
                left: CIRC_CX - 110,
                top: CIRC_CY + 35,
                width: 220,
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: 16,
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

    // Footer asterisco
    ...(textos.footer
      ? [
          el(
            'div',
            {
              style: {
                position: 'absolute',
                left: 0,
                top: FOOTER_Y - 10,
                width: W,
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: 18,
                color: 'white',
                textAlign: 'center',
                display: 'flex',
                justifyContent: 'center',
              },
            },
            textos.footer,
          ),
        ]
      : []),
  )
}

export const LAYOUT_DESKTOP_DIMENSIONS = { width: W, height: H } as const

// Posições dos ícones do card (centrados no top-half de cada quadrante).
// Consumido pelo composeDesktop pra posicionar ícones via Sharp.
export const ICONE_CARD_POSICOES_DESKTOP = [
  { cx: Q_LEFT_X + Q_W / 2, cy: Q_TOP_Y + 50 },  // TL
  { cx: Q_RIGHT_X + Q_W / 2, cy: Q_TOP_Y + 50 }, // TR
  { cx: Q_LEFT_X + Q_W / 2, cy: Q_BOT_Y + 50 },  // BL
  { cx: Q_RIGHT_X + Q_W / 2, cy: Q_BOT_Y + 50 }, // BR
] as const
export const ICONE_CARD_SIZE_DESKTOP = 70
