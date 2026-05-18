'use client'

import { TooltipInfo } from '@/components/tooltip-info'

interface KeywordFieldProps {
  value: string
  onChange: (next: string) => void
  /** Helper de fallback exibido como hint. */
  fallbackHint?: string
  disabled?: boolean
}

const MAX_LEN = 20
const TOOLTIP_TEXT =
  'Palavra-chave do arquivo (opcional). 1 palavra, max 20 chars. Fallback: primeira palavra do conteúdo.'

export function KeywordField({
  value,
  onChange,
  fallbackHint,
  disabled,
}: KeywordFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-medium">
          Palavra-chave do arquivo (opcional)
          <TooltipInfo text={TOOLTIP_TEXT} />
        </label>
        <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
          {value.length}/{MAX_LEN}
        </span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_LEN))}
        disabled={disabled}
        placeholder={fallbackHint ?? 'ex.: bucha, floral, descontao'}
        maxLength={MAX_LEN}
        className="h-10 rounded-md border border-[color:var(--border-strong)] bg-white px-3 text-[13.5px] outline-none focus:border-[#553679] focus:ring-2 focus:ring-[#553679]/15 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  )
}
