'use client'

import { Sparkles } from 'lucide-react'
import { TooltipInfo } from '@/components/tooltip-info'
import { M1_TOOLTIPS } from '@/lib/m1/tooltips'

interface GenerateButtonProps {
  isValid: boolean
  loading: boolean
  qtdFotos: number
  onClick: () => void
}

export function GenerateButton({ isValid, loading, qtdFotos, onClick }: GenerateButtonProps) {
  const label = loading
    ? qtdFotos > 1
      ? `Gerando ${qtdFotos} fotos...`
      : 'Gerando...'
    : qtdFotos > 1
    ? `Gerar ${qtdFotos} fotos`
    : 'Gerar foto'

  return (
    <div className="flex items-center justify-end gap-3">
      {!isValid && (
        <div className="text-[11.5px] text-[color:var(--text-tertiary)]">
          Preencha todos os campos obrigatórios.
        </div>
      )}
      <TooltipInfo text={M1_TOOLTIPS.botaoGerar} />
      <button
        type="button"
        onClick={onClick}
        disabled={!isValid || loading}
        className="inline-flex items-center gap-2 rounded-lg bg-[#553679] px-5 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-[#46295F] disabled:cursor-not-allowed disabled:bg-[#C7BCD6] disabled:text-white/90"
      >
        <Sparkles size={14} />
        {label}
      </button>
    </div>
  )
}
