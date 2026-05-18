/**
 * T2 Subtemplates — shared rendering helpers
 *
 * Compartilhado entre cover, content-*, comparison, cta-final pra render
 * text lines com whiteSpace nowrap (impede Satori re-quebrar wrap calculado
 * pelo text-renderer — ver lição Fase 1).
 */

import * as React from 'react'

export interface RenderTextLinesArgs {
  lines: string[]
  fontWeight: number
  fontSize: number
  lineHeight: number
  color: string
  opacity?: number
  letterSpacing?: string
  align?: 'left' | 'center' | 'right'
}

export function renderTextLines(args: RenderTextLinesArgs): React.ReactElement {
  const align = args.align ?? 'center'
  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: justify,
        justifyContent: 'center',
        width: '100%',
      }}
    >
      {args.lines.map((ln, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            fontFamily: 'Montserrat',
            fontWeight: args.fontWeight,
            fontSize: args.fontSize,
            lineHeight: args.lineHeight,
            color: args.color,
            opacity: args.opacity ?? 1,
            textAlign: align,
            justifyContent: justify,
            letterSpacing: args.letterSpacing ?? '0',
            whiteSpace: 'nowrap',
          }}
        >
          {ln}
        </div>
      ))}
    </div>
  )
}
