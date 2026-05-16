'use client'

import Image from 'next/image'
import { M2_LOGO_OPTIONS, type M2LogoOption } from '@/lib/m2/schema'
import { TooltipInfo } from '@/components/tooltip-info'
import { cn } from '@/lib/utils'

const LABELS: Record<M2LogoOption, string> = {
  casinha: 'Casinha',
  quadrado: 'Quadrado',
  '3d': '3D',
  retangular: 'Charme',
}

interface LogoSelectorProps {
  value: M2LogoOption
  onChange: (next: M2LogoOption) => void
  disabled?: boolean
}

/**
 * Seletor discreto de logo do footer-overlay (Adendo §11.2).
 * 4 miniaturas 32×32 sobre fundo roxo (#553679) pra logos brancos/transparentes
 * ficarem visíveis. `casinha` é default (90% dos casos).
 */
export function LogoSelector({ value, onChange, disabled }: LogoSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2 text-xs font-medium">
        Logo da marca
        <TooltipInfo text="Logo aplicada no rodapé do post via composite (Sharp), depois da geração da IA. Casinha = default (90% dos casos)." />
      </label>
      <div className="flex gap-2">
        {M2_LOGO_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            disabled={disabled}
            aria-pressed={value === opt}
            className={cn(
              'flex flex-col items-center gap-1 rounded-md border p-1.5 transition-colors',
              value === opt
                ? 'border-[#553679] bg-[#EEEDFE]/40'
                : 'border-[color:var(--border-default)] hover:bg-[#F4F4F2]',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <div className="relative h-8 w-8 overflow-hidden rounded bg-[#553679]">
              <Image
                src={`/brand/m2/logos/logo-${opt}.png`}
                alt={LABELS[opt]}
                fill
                sizes="32px"
                className="object-contain p-1"
              />
            </div>
            <span className="text-[10px] text-[color:var(--text-secondary)]">{LABELS[opt]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
