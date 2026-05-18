'use client'

import * as React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { TooltipInfo } from '@/components/tooltip-info'
import type { M3Input, M3Condicao } from '@/lib/m3/schema'

interface FormCondicoesProps {
  form: UseFormReturn<M3Input>
  disabled?: boolean
}

interface Condicao {
  id: M3Condicao
  label: string
  helper: string
}

const CONDICOES: Condicao[] = [
  { id: '12x-cartao', label: 'Pague em até 12x no cartão', helper: 'Ícone: cartão' },
  { id: 'frete-gratis', label: 'FRETE GRÁTIS*', helper: 'Ícone: presente · subtexto no rodapé' },
  { id: 'cashback', label: 'CASHBACK na próxima compra', helper: 'Ícone: dinheiro' },
  { id: 'entrega-rapida', label: 'Entrega Rápida em todo Brasil', helper: 'Ícone: foguete' },
  { id: 'entrega-turbinada', label: 'Entrega TURBINADA Liberada', helper: 'Ícone: foguete' },
]

const MAX = 4

export function FormCondicoes({ form, disabled }: FormCondicoesProps) {
  const selecionadas = form.watch('condicoes') as M3Condicao[]

  function toggle(id: M3Condicao) {
    const isOn = selecionadas.includes(id)
    if (isOn) {
      form.setValue(
        'condicoes',
        selecionadas.filter((c) => c !== id),
        { shouldValidate: true },
      )
    } else {
      if (selecionadas.length >= MAX) {
        toast.error(`Máximo ${MAX} condições por banner. Desmarque uma antes.`)
        return
      }
      form.setValue('condicoes', [...selecionadas, id], { shouldValidate: true })
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-[color:var(--border-default)] bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-[color:var(--text-primary)]">
          Condições do footer
          <TooltipInfo text="Selecione até 4 condições que aparecerão no card do banner." />
        </h2>
        <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
          {selecionadas.length}/{MAX}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
        {CONDICOES.map((c) => {
          const isOn = selecionadas.includes(c.id)
          const isDisabled = disabled || (!isOn && selecionadas.length >= MAX)
          return (
            <label
              key={c.id}
              className={[
                'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition',
                isOn
                  ? 'border-[#553679] bg-[#EEEDFE]'
                  : 'border-[color:var(--border-default)] hover:bg-[color:var(--bg-tertiary)]',
                isDisabled ? 'cursor-not-allowed opacity-50 hover:bg-transparent' : '',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={isOn}
                disabled={isDisabled}
                onChange={() => toggle(c.id)}
                className="mt-0.5 h-4 w-4 rounded border-[color:var(--border-default)] text-[#553679] focus:ring-[#553679]"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-[color:var(--text-primary)]">{c.label}</span>
                <span className="text-[11px] text-[color:var(--text-tertiary)]">{c.helper}</span>
              </div>
            </label>
          )
        })}
      </div>
    </section>
  )
}
