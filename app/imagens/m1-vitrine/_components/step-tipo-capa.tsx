'use client'

import { TooltipInfo } from '@/components/tooltip-info'
import { M1_TOOLTIPS } from '@/lib/m1/tooltips'
import type { M1TipoCapa } from '@/lib/m1/schema'
import { cn } from '@/lib/utils'

interface StepTipoCapaProps {
  value: M1TipoCapa | null
  onChange: (tipo: M1TipoCapa) => void
}

const OPCOES: { id: M1TipoCapa; label: string; tooltip: string; descricao: string }[] = [
  {
    id: 'estampada',
    label: 'Estampada',
    descricao: 'Padrão impresso 2D',
    tooltip: M1_TOOLTIPS.tipoCapaEstampada,
  },
  {
    id: 'lisa',
    label: 'Lisa',
    descricao: 'Cor uniforme',
    tooltip: M1_TOOLTIPS.tipoCapaLisa,
  },
  {
    id: 'alto-relevo',
    label: 'Alto Relevo',
    descricao: 'Quiltado 3D',
    tooltip: M1_TOOLTIPS.tipoCapaAltoRelevo,
  },
]

export function StepTipoCapa({ value, onChange }: StepTipoCapaProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Tipo de capa</span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {OPCOES.map((opt) => {
          const selected = value === opt.id
          return (
            <div key={opt.id} className="relative">
              <button
                type="button"
                onClick={() => onChange(opt.id)}
                className={cn(
                  'group flex w-full flex-col items-start gap-0.5 rounded-lg border bg-white px-3 py-2.5 text-left transition hover:border-[color:var(--border-strong)]',
                  selected
                    ? 'border-2 border-[#553679] ring-2 ring-[#553679]/25 shadow-md'
                    : 'border-[color:var(--border-default)]'
                )}
              >
                <div className="text-[12.5px] font-medium leading-tight">{opt.label}</div>
                <div className="text-[10.5px] leading-tight text-[color:var(--text-secondary)]">
                  {opt.descricao}
                </div>
              </button>
              <div className="absolute right-2 top-2">
                <TooltipInfo text={opt.tooltip} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
