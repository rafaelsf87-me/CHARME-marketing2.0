'use client'

import * as React from 'react'
import { TooltipInfo } from './tooltip-info'
import { cn } from '@/lib/utils'

export interface TextFieldWithCounterProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'maxLength' | 'value'> {
  label: string
  maxLength: number
  tooltipText: string
  colorIndicator?: string
  value: string
  error?: string
}

export const TextFieldWithCounter = React.forwardRef<HTMLInputElement, TextFieldWithCounterProps>(
  ({ label, maxLength, tooltipText, colorIndicator, value, error, className, id, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const count = (value ?? '').length
    const atLimit = count >= maxLength

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor={inputId} className="flex items-center gap-2 text-xs font-medium">
            {colorIndicator && (
              <span
                className="inline-block h-2.5 w-2.5 rounded-full border border-black/10"
                style={{ background: colorIndicator }}
                aria-hidden
              />
            )}
            <span>{label}</span>
            <TooltipInfo text={tooltipText} />
          </label>
          <span
            className={cn(
              'tabular-nums text-[11px]',
              atLimit ? 'text-[#A32D2D]' : 'text-[color:var(--text-tertiary)]'
            )}
          >
            {count}/{maxLength}
          </span>
        </div>
        <input
          id={inputId}
          ref={ref}
          value={value}
          maxLength={maxLength}
          className={cn(
            'h-10 w-full rounded-md border border-[color:var(--border-strong)] bg-white px-3 text-sm outline-none transition focus:border-[#553679] focus:ring-2 focus:ring-[#553679]/15',
            error && 'border-[#A32D2D] focus:border-[#A32D2D] focus:ring-[#A32D2D]/15',
            className
          )}
          {...props}
        />
        {error && <span className="text-[11px] text-[#A32D2D]">{error}</span>}
      </div>
    )
  }
)
TextFieldWithCounter.displayName = 'TextFieldWithCounter'
