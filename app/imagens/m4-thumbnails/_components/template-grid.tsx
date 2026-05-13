'use client'

import { M4_TEMPLATE_DEFS } from '@/lib/m4/templates'
import type { M4Template } from '@/lib/m4/schema'
import { TooltipInfo } from '@/components/tooltip-info'
import { M4_TOOLTIPS } from '@/lib/m4/tooltips'
import { cn } from '@/lib/utils'

interface TemplateGridProps {
  value: M4Template | null
  onChange: (id: M4Template) => void
}

export function TemplateGrid({ value, onChange }: TemplateGridProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Escolha o template</span>
        <TooltipInfo text={M4_TOOLTIPS.template} />
      </div>

      <div className="grid grid-cols-5 gap-2.5">
        {M4_TEMPLATE_DEFS.map((t) => {
          const selected = value === t.id
          return (
            <button
              type="button"
              key={t.id}
              onClick={() => onChange(t.id)}
              className={cn(
                'group relative flex flex-col items-stretch gap-2 rounded-lg border bg-white p-2.5 text-left transition hover:border-[color:var(--border-strong)]',
                selected
                  ? 'border-[1.5px] border-[#553679] shadow-sm'
                  : 'border-[color:var(--border-default)]'
              )}
            >
              <div className="relative aspect-[9/16] overflow-hidden rounded-md bg-[#F4F4F2]">
                <TemplateThumb anchorPercent={t.verticalAnchorPercent} lines={t.lines} />
              </div>
              <div>
                <div className="text-[11.5px] font-medium leading-tight">{t.name}</div>
                <div className="mt-0.5 text-[10.5px] leading-tight text-[color:var(--text-secondary)]">
                  {t.lines === 3 ? '3 linhas' : '2 linhas'}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TemplateThumb({ anchorPercent, lines }: { anchorPercent: number; lines: 2 | 3 }) {
  const top = `${anchorPercent - (lines === 3 ? 14 : 10)}%`
  return (
    <div className="absolute inset-0">
      <div
        className="absolute left-1/2 flex w-[80%] -translate-x-1/2 flex-col gap-[3px]"
        style={{ top, transform: 'translateX(-50%) rotate(-2.5deg)' }}
      >
        <div className="h-[10px] rounded-[3px] bg-white shadow-sm" />
        <div className="h-[10px] rounded-[3px] bg-[#553679]" />
        {lines === 3 && <div className="h-[10px] rounded-[3px] bg-[#4CDDC3]" />}
      </div>
    </div>
  )
}
