'use client'

import { Check } from 'lucide-react'
import { TooltipInfo } from '@/components/tooltip-info'
import { M1_TOOLTIPS } from '@/lib/m1/tooltips'
import type { M1TipoFoto } from '@/lib/m1/schema'
import { cn } from '@/lib/utils'

interface StepTipoFotoProps {
  value: M1TipoFoto[]
  onChange: (tipos: M1TipoFoto[]) => void
}

const OPCOES: { id: M1TipoFoto; label: string; tooltip: string }[] = [
  { id: 'capa', label: 'Foto Capa', tooltip: M1_TOOLTIPS.tipoFotoCapa },
  { id: 'ambiente', label: 'Foto Ambiente', tooltip: M1_TOOLTIPS.tipoFotoAmbiente },
  { id: 'elastico', label: 'Foto Elástico', tooltip: M1_TOOLTIPS.tipoFotoElastico },
  { id: 'detalhe-tecido', label: 'Detalhe do Tecido', tooltip: M1_TOOLTIPS.tipoFotoDetalheTecido },
]

export function StepTipoFoto({ value, onChange }: StepTipoFotoProps) {
  function toggle(id: M1TipoFoto) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Tipo de foto</span>
        <span className="text-[11px] text-[color:var(--text-tertiary)]">(selecione 1 a 4)</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {OPCOES.map((opt) => {
          const selected = value.includes(opt.id)
          return (
            <div key={opt.id} className="relative">
              <button
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => toggle(opt.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-left transition hover:border-[color:var(--border-strong)]',
                  selected
                    ? 'border-2 border-[#553679] ring-2 ring-[#553679]/25 shadow-sm'
                    : 'border-[color:var(--border-default)]'
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition',
                    selected
                      ? 'border-[#553679] bg-[#553679] text-white'
                      : 'border-[color:var(--border-strong)] bg-white'
                  )}
                  aria-hidden
                >
                  {selected && <Check size={11} strokeWidth={3} />}
                </span>
                <span className="text-[12.5px] font-medium leading-tight">{opt.label}</span>
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
