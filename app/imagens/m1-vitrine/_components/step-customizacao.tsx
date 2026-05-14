'use client'

import { TooltipInfo } from '@/components/tooltip-info'
import { M1_TOOLTIPS } from '@/lib/m1/tooltips'

interface StepCustomizacaoProps {
  value: string
  onChange: (value: string) => void
}

export function StepCustomizacao({ value, onChange }: StepCustomizacaoProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Customização (opcional)</span>
        <TooltipInfo text={M1_TOOLTIPS.customization} />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex: mais luz natural, menos saturação"
        maxLength={500}
        rows={3}
        className="w-full resize-y rounded-md border border-[color:var(--border-strong)] bg-white px-3 py-2 text-sm outline-none focus:border-[#553679] focus:ring-2 focus:ring-[#553679]/15"
      />
    </div>
  )
}
