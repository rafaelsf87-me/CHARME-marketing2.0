'use client'

import * as React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { TooltipInfo } from '@/components/tooltip-info'
import type { M3Input } from '@/lib/m3/schema'

interface FormTextosProps {
  form: UseFormReturn<M3Input>
  disabled?: boolean
}

export function FormTextos({ form, disabled }: FormTextosProps) {
  const { register, watch, formState } = form
  const nomeLen = (watch('textos.nomePromocao') ?? '').length
  const descontoLen = (watch('textos.descontoTexto') ?? '').length

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-[color:var(--border-default)] bg-white p-5">
      <h2 className="text-sm font-medium text-[color:var(--text-primary)]">Textos do banner</h2>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-medium">
            Nome da promoção *
            <TooltipInfo text="Texto principal do banner (ex.: 'DESCONTÃO DE MÃE', 'BOTA FORA CHARME'). Vira título 3D balão." />
          </label>
          <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
            {nomeLen}/60
          </span>
        </div>
        <Input
          {...register('textos.nomePromocao')}
          disabled={disabled}
          placeholder="Ex.: DESCONTÃO DE MÃE"
          maxLength={60}
        />
        {formState.errors.textos?.nomePromocao && (
          <span className="text-[11px] text-[#A32D2D]">
            {formState.errors.textos.nomePromocao.message}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-medium">
            Texto do desconto *
            <TooltipInfo text="Texto do desconto (ex.: '35% OFF', 'Até 74% OFF'). Aparece na bola/círculo." />
          </label>
          <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
            {descontoLen}/30
          </span>
        </div>
        <Input
          {...register('textos.descontoTexto')}
          disabled={disabled}
          placeholder="Ex.: 38% OFF"
          maxLength={30}
        />
        {formState.errors.textos?.descontoTexto && (
          <span className="text-[11px] text-[#A32D2D]">
            {formState.errors.textos.descontoTexto.message}
          </span>
        )}
      </div>

      <label className="mt-1 flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          {...register('textos.naLojaToda')}
          disabled={disabled}
          className="h-4 w-4 rounded border-[color:var(--border-default)] text-[#E91E63] focus:ring-[#E91E63]"
        />
        <span className="font-medium">Incluir &ldquo;na loja toda&rdquo;</span>
        <TooltipInfo text="Texto fixo abaixo do desconto. Desmarque pra remover." />
      </label>
    </section>
  )
}
