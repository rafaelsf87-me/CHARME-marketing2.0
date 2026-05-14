'use client'

import * as React from 'react'
import { TooltipInfo } from '@/components/tooltip-info'
import { M1_TOOLTIPS } from '@/lib/m1/tooltips'

interface StepCorLisaProps {
  value: string | null
  onChange: (hex: string | null) => void
}

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function StepCorLisa({ value, onChange }: StepCorLisaProps) {
  const [text, setText] = React.useState(value ?? '#553679')
  const [error, setError] = React.useState<string | null>(null)

  // Sincroniza valor externo (ex: reset).
  React.useEffect(() => {
    if (value !== null && value !== text) setText(value)
  }, [value, text])

  function commit(next: string) {
    const trimmed = next.trim()
    if (!HEX_REGEX.test(trimmed)) {
      setError('Use #RGB ou #RRGGBB')
      onChange(null)
      return
    }
    setError(null)
    onChange(trimmed.toUpperCase())
  }

  function onPicker(e: React.ChangeEvent<HTMLInputElement>) {
    const hex = e.target.value.toUpperCase()
    setText(hex)
    commit(hex)
  }

  function onText(e: React.ChangeEvent<HTMLInputElement>) {
    setText(e.target.value)
    commit(e.target.value)
  }

  // O <input type="color"> só aceita 6 dígitos.
  const pickerValue = HEX_REGEX.test(text) && text.length === 7 ? text : '#553679'

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Cor da capa lisa</span>
        <TooltipInfo text={M1_TOOLTIPS.corLisa} />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={onPicker}
          className="h-9 w-12 cursor-pointer rounded-md border border-[color:var(--border-default)] bg-white p-1"
          aria-label="Seletor de cor"
        />
        <input
          type="text"
          value={text}
          onChange={onText}
          placeholder="#553679"
          spellCheck={false}
          className="h-9 w-32 rounded-md border border-[color:var(--border-default)] bg-white px-2 text-xs font-mono uppercase outline-none focus:border-[color:var(--border-strong)]"
        />
        {error && <span className="text-[11px] text-red-600">{error}</span>}
      </div>
    </div>
  )
}
