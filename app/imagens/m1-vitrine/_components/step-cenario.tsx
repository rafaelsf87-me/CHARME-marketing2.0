'use client'

import { TooltipInfo } from '@/components/tooltip-info'
import { M1_TOOLTIPS } from '@/lib/m1/tooltips'
import { getTemplatesPorMovelETipo } from '@/lib/m1/templates'
import type { M1Movel, M1TipoFoto } from '@/lib/m1/schema'
import { cn } from '@/lib/utils'

interface StepCenarioProps {
  movel: M1Movel
  tipoFoto: M1TipoFoto
  value: string | null
  onChange: (id: string) => void
}

export function StepCenario({ movel, tipoFoto, value, onChange }: StepCenarioProps) {
  const templates = getTemplatesPorMovelETipo(movel, tipoFoto)

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Cenário</span>
        <TooltipInfo text={M1_TOOLTIPS.cenario} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {templates.map((t) => {
          const selected = value === t.id
          return (
            <button
              type="button"
              key={t.id}
              onClick={() => onChange(t.id)}
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
                  src={t.thumbnailPath}
                  alt={t.nome}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
              <div>
                <div className="text-[11.5px] font-medium leading-tight">{t.nome}</div>
                <div className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-[color:var(--text-secondary)]">
                  {t.descricao}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
