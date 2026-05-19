'use client'

import { TooltipInfo } from '@/components/tooltip-info'
import { cn } from '@/lib/utils'
import type { T2ModoGeracao } from '@/lib/m2/t2/types'

const OPTS: T2ModoGeracao[] = ['ia', 'upload']

const LABELS: Record<T2ModoGeracao, string> = {
  ia: 'IA (automático)',
  upload: 'Upload de imagens',
}

interface T2ModoGeracaoSelectorProps {
  value: T2ModoGeracao
  onChange: (next: T2ModoGeracao) => void
  disabled?: boolean
}

export function T2ModoGeracaoSelector({ value, onChange, disabled }: T2ModoGeracaoSelectorProps) {
  return (
    <div className="flex w-fit flex-col gap-1.5">
      <label className="flex items-center gap-2 text-xs font-medium">
        Modo de geração
        <TooltipInfo text="IA: planner cria asset principal via gpt-image-1 (rápido, pode ter erros físicos). Upload: você fornece 1 imagem por slide via upload — usada direto, sem IA (DEC-M2-014). Garante fidelidade do produto." />
      </label>
      <div className="inline-flex rounded-md border border-[color:var(--border-default)] bg-white p-0.5">
        {OPTS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            disabled={disabled}
            aria-pressed={value === opt}
            className={cn(
              'rounded px-3 py-1.5 text-xs font-medium transition-colors',
              value === opt
                ? 'bg-[#553679] text-white'
                : 'text-[color:var(--text-secondary)] hover:bg-[#F4F4F2]',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {LABELS[opt]}
          </button>
        ))}
      </div>
    </div>
  )
}
