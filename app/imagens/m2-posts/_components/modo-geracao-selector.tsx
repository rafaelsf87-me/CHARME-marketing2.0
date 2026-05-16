'use client'

import { M2_MODO_GERACAO, type M2ModoGeracao } from '@/lib/m2/schema'
import { TooltipInfo } from '@/components/tooltip-info'
import { cn } from '@/lib/utils'

const LABELS: Record<M2ModoGeracao, string> = {
  ia: 'IA (automático)',
  upload: 'Upload de imagens',
}

interface ModoGeracaoSelectorProps {
  value: M2ModoGeracao
  onChange: (next: M2ModoGeracao) => void
  disabled?: boolean
}

/**
 * Seletor binário do modo de geração (Adendo §11.3).
 * - IA: composição livre via gpt-image-1 (rápido, mas pode ter erros físicos).
 * - Upload: usuário fornece 1-8 PNGs + instruções de uso. Garante fidelidade.
 *
 * Sem dep de @radix-ui/react-radio-group — usa buttons com aria-pressed
 * (consistente com LogoSelector).
 */
export function ModoGeracaoSelector({ value, onChange, disabled }: ModoGeracaoSelectorProps) {
  return (
    // w-fit (hotfix v6): não estica pra largura do parent. Em layouts de 1 col
    // (T1, sem LogoSelector ao lado), evita o "quadro branco esticado" vazio.
    <div className="flex w-fit flex-col gap-1.5">
      <label className="flex items-center gap-2 text-xs font-medium">
        Modo de geração
        <TooltipInfo text="IA: gera composição visual do zero (rápido, mas pode ter erros físicos/anatômicos). Upload: você fornece imagens (1-8 PNGs) + instruções de uso por nome de arquivo e slide. Garante fidelidade visual." />
      </label>
      <div className="inline-flex rounded-md border border-[color:var(--border-default)] bg-white p-0.5">
        {M2_MODO_GERACAO.map((opt) => (
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
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {LABELS[opt]}
          </button>
        ))}
      </div>
    </div>
  )
}
