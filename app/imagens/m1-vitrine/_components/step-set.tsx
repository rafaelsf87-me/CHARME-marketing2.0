'use client'

import { TooltipInfo } from '@/components/tooltip-info'
import { M1_TOOLTIPS } from '@/lib/m1/tooltips'
import type { M1Movel } from '@/lib/m1/schema'
import type { M1Set } from '@/lib/m1/templates'
import { cn } from '@/lib/utils'

interface StepSetProps {
  movel: M1Movel
  value: M1Set | null
  onChange: (set: M1Set) => void
}

// Preview de cada Set vem da capa principal do mesmo Set+móvel.
// Ex: Sofá Set 1 → /templates/m1/sofa-capa-1/thumbnail.webp
function previewPath(movel: M1Movel, set: M1Set): string {
  return `/templates/m1/${movel}-capa-${set}/thumbnail.webp`
}

const OPCOES: { id: M1Set; label: string; descricao: string }[] = [
  { id: 1, label: 'Set 1', descricao: 'Estética 1 — coerente em capa, ambiente, elástico e detalhe' },
  { id: 2, label: 'Set 2', descricao: 'Estética 2 — alternativa com decoração e ângulos diferentes' },
]

export function StepSet({ movel, value, onChange }: StepSetProps) {
  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Set</span>
        <TooltipInfo text={M1_TOOLTIPS.set} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {OPCOES.map((opt) => {
          const selected = value === opt.id
          const preview = previewPath(movel, opt.id)
          return (
            <button
              type="button"
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={cn(
                'group relative flex w-full flex-col items-stretch gap-2 rounded-lg border bg-white p-2 text-left transition hover:border-[color:var(--border-strong)]',
                selected
                  ? 'border-[1.5px] border-[#553679] shadow-sm'
                  : 'border-[color:var(--border-default)]'
              )}
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-[#F4F4F2]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt={`${opt.label} ${movel}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
              <div>
                <div className="text-[12.5px] font-medium leading-tight">{opt.label}</div>
                <div className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-[color:var(--text-secondary)]">
                  {opt.descricao}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
