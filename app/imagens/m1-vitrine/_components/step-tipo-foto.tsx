'use client'

import { TooltipInfo } from '@/components/tooltip-info'
import { M1_TOOLTIPS } from '@/lib/m1/tooltips'
import type { M1TipoFoto } from '@/lib/m1/schema'
import { cn } from '@/lib/utils'

interface StepTipoFotoProps {
  value: M1TipoFoto | null
  onChange: (tipo: M1TipoFoto) => void
}

const OPCOES: { id: M1TipoFoto; label: string; descricao: string; tooltip: string }[] = [
  {
    id: 'capa',
    label: 'Foto Capa',
    descricao: 'Móvel com capa em cenário',
    tooltip: M1_TOOLTIPS.tipoFotoCapa,
  },
  {
    id: 'ambiente',
    label: 'Foto Ambiente',
    descricao: 'Sala com múltiplos móveis',
    tooltip: M1_TOOLTIPS.tipoFotoAmbiente,
  },
  {
    id: 'elastico',
    label: 'Foto Elástico',
    descricao: 'Mão esticando a capa',
    tooltip: M1_TOOLTIPS.tipoFotoElastico,
  },
  {
    id: 'detalhe-tecido',
    label: 'Detalhe do Tecido',
    descricao: 'Costuras + assento original',
    tooltip: M1_TOOLTIPS.tipoFotoDetalheTecido,
  },
]

export function StepTipoFoto({ value, onChange }: StepTipoFotoProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Tipo de foto</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {OPCOES.map((opt) => {
          const selected = value === opt.id
          return (
            <div key={opt.id} className="relative">
              <button
                type="button"
                onClick={() => onChange(opt.id)}
                className={cn(
                  'flex w-full flex-col items-start gap-0.5 rounded-lg border bg-white px-3 py-2.5 text-left transition hover:border-[color:var(--border-strong)]',
                  selected
                    ? 'border-[1.5px] border-[#553679] shadow-sm'
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
