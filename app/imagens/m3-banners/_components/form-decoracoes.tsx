'use client'

import * as React from 'react'
import Image from 'next/image'
import type { UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { TooltipInfo } from '@/components/tooltip-info'
import { DECORACOES_BANCO } from '@/lib/m3/decoracoes-banco'
import type { M3Input } from '@/lib/m3/schema'

interface FormDecoracoesProps {
  form: UseFormReturn<M3Input>
  disabled?: boolean
}

const MAX_BANCO = 8
const MAX_IA = 4

export function FormDecoracoes({ form, disabled }: FormDecoracoesProps) {
  const decoracoes = form.watch('decoracoes')

  function setModo(modo: 'banco' | 'ia') {
    if (modo === 'banco') {
      form.setValue(
        'decoracoes',
        {
          modo: 'banco',
          ids: ['coracao-rosa', 'coracao-batendo', 'coracao-decoracao', 'coracao-vermelho'],
        },
        { shouldValidate: true },
      )
    } else {
      form.setValue('decoracoes', { modo: 'ia', prompts: [''] }, { shouldValidate: true })
    }
  }

  function toggleBanco(id: string) {
    if (decoracoes.modo !== 'banco') return
    const isOn = decoracoes.ids.includes(id)
    if (isOn) {
      const next = decoracoes.ids.filter((x) => x !== id)
      if (next.length === 0) {
        toast.error('Selecione pelo menos 1 decoração.')
        return
      }
      form.setValue('decoracoes', { modo: 'banco', ids: next }, { shouldValidate: true })
    } else {
      if (decoracoes.ids.length >= MAX_BANCO) {
        toast.error(`Máximo ${MAX_BANCO} decorações por banner.`)
        return
      }
      form.setValue(
        'decoracoes',
        { modo: 'banco', ids: [...decoracoes.ids, id] },
        { shouldValidate: true },
      )
    }
  }

  function updatePromptIA(idx: number, valor: string) {
    if (decoracoes.modo !== 'ia') return
    const next = [...decoracoes.prompts]
    next[idx] = valor
    form.setValue('decoracoes', { modo: 'ia', prompts: next }, { shouldValidate: true })
  }

  function addPromptIA() {
    if (decoracoes.modo !== 'ia') return
    if (decoracoes.prompts.length >= MAX_IA) {
      toast.error(`Máximo ${MAX_IA} decorações IA.`)
      return
    }
    form.setValue(
      'decoracoes',
      { modo: 'ia', prompts: [...decoracoes.prompts, ''] },
      { shouldValidate: true },
    )
  }

  function removePromptIA(idx: number) {
    if (decoracoes.modo !== 'ia') return
    if (decoracoes.prompts.length <= 1) {
      toast.error('Mantém pelo menos 1 prompt.')
      return
    }
    form.setValue(
      'decoracoes',
      { modo: 'ia', prompts: decoracoes.prompts.filter((_, i) => i !== idx) },
      { shouldValidate: true },
    )
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-[color:var(--border-default)] bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-medium text-[color:var(--text-primary)]">
        Decorações
        <TooltipInfo text="Banco curado (Fluent Emoji 3D) OU geração IA via Flux." />
      </h2>

      <div className="flex gap-3">
        <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-md border p-3 transition">
          <input
            type="radio"
            name="decoracoes-modo"
            checked={decoracoes.modo === 'banco'}
            disabled={disabled}
            onChange={() => setModo('banco')}
            className="h-4 w-4 text-[#E91E63] focus:ring-[#E91E63]"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-[color:var(--text-primary)]">Banco curado</span>
            <span className="text-[11px] text-[color:var(--text-tertiary)]">
              13 PNGs do Microsoft Fluent Emoji 3D. Custo: $0.
            </span>
          </div>
        </label>

        <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-md border p-3 transition">
          <input
            type="radio"
            name="decoracoes-modo"
            checked={decoracoes.modo === 'ia'}
            disabled={disabled}
            onChange={() => setModo('ia')}
            className="h-4 w-4 text-[#E91E63] focus:ring-[#E91E63]"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-[color:var(--text-primary)]">IA (Flux)</span>
            <span className="text-[11px] text-[color:var(--text-tertiary)]">
              Geração sob demanda via prompt. $0.05/decoração.
            </span>
          </div>
        </label>
      </div>

      {decoracoes.modo === 'banco' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[color:var(--text-secondary)]">
              Selecione decorações (clique pra alternar)
            </span>
            <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
              {decoracoes.ids.length}/{MAX_BANCO}
            </span>
          </div>
          <div className="grid gap-3 grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
            {DECORACOES_BANCO.map((d) => {
              const isOn = decoracoes.ids.includes(d.id)
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleBanco(d.id)}
                  disabled={disabled}
                  title={d.nomePtBr}
                  className={[
                    'group relative flex flex-col items-center gap-1 rounded-md border bg-white p-2 transition',
                    isOn
                      ? 'border-[#E91E63] ring-2 ring-[#E91E63]'
                      : 'border-[color:var(--border-default)] hover:border-[#E91E63]',
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <div className="relative h-12 w-12">
                    <Image
                      src={`/brand/m3/decoracoes/${d.filename}`}
                      alt={d.nomePtBr}
                      fill
                      sizes="48px"
                      className="object-contain"
                    />
                  </div>
                  <span className="line-clamp-1 text-center text-[10px] text-[color:var(--text-secondary)]">
                    {d.nomePtBr}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {decoracoes.modo === 'ia' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[color:var(--text-secondary)]">
              Descreva cada decoração (até {MAX_IA})
            </span>
            <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
              {decoracoes.prompts.length}/{MAX_IA} · custo ~$
              {(decoracoes.prompts.length * 0.05).toFixed(2)}
            </span>
          </div>

          {decoracoes.prompts.map((prompt, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <Textarea
                value={prompt}
                onChange={(e) => updatePromptIA(idx, e.target.value)}
                disabled={disabled}
                placeholder="Ex.: flor rosa pequena 3D balão, isolada"
                rows={2}
                maxLength={300}
                className="flex-1 text-sm"
              />
              <button
                type="button"
                onClick={() => removePromptIA(idx)}
                disabled={disabled}
                aria-label="Remover prompt"
                className="mt-1 rounded p-1 text-[color:var(--text-tertiary)] hover:bg-[color:var(--bg-tertiary)] hover:text-[#A32D2D] disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {decoracoes.prompts.length < MAX_IA && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPromptIA}
              disabled={disabled}
              className="w-fit"
            >
              + Adicionar decoração
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
