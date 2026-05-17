'use client'

import * as React from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { TooltipInfo } from '@/components/tooltip-info'
import type { M3Input } from '@/lib/m3/schema'
import { brandM3 } from '@/lib/brand/m3.brand'

interface FormCoresProps {
  form: UseFormReturn<M3Input>
  disabled?: boolean
}

interface CorRowProps {
  label: string
  tooltip: string
  field: 'primary' | 'secondary' | 'accent'
  form: UseFormReturn<M3Input>
  disabled?: boolean
}

function CorRow({ label, tooltip, field, form, disabled }: CorRowProps) {
  const value = form.watch(`cores.${field}`)
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="flex items-center gap-2 text-xs font-medium">
        {label}
        <TooltipInfo text={tooltip} />
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => form.setValue(`cores.${field}`, e.target.value, { shouldValidate: true })}
          disabled={disabled}
          aria-label={label}
          className="h-8 w-12 cursor-pointer rounded border border-[color:var(--border-default)] bg-white p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <code className="rounded bg-[color:var(--bg-tertiary)] px-2 py-1 font-mono text-[11px] uppercase tabular-nums text-[color:var(--text-secondary)]">
          {value}
        </code>
      </div>
    </div>
  )
}

export function FormCores({ form, disabled }: FormCoresProps) {
  function restaurarDefaults() {
    form.setValue('cores.primary', brandM3.defaultColors.primary, { shouldValidate: true })
    form.setValue('cores.secondary', brandM3.defaultColors.secondary, { shouldValidate: true })
    form.setValue('cores.accent', brandM3.defaultColors.accent, { shouldValidate: true })
    form.setValue('cores.cardBg', brandM3.defaultColors.cardBg, { shouldValidate: true })
    form.setValue('cores.cardBgEnd', brandM3.defaultColors.cardBgEnd, { shouldValidate: true })
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-[color:var(--border-default)] bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-[color:var(--text-primary)]">Cores</h2>
        <button
          type="button"
          onClick={restaurarDefaults}
          disabled={disabled}
          className="text-[11px] text-[color:var(--text-secondary)] underline decoration-dotted underline-offset-2 hover:text-[color:var(--text-primary)] disabled:opacity-50"
        >
          Restaurar defaults
        </button>
      </div>

      <CorRow
        label="Primary"
        tooltip="Cor principal do BG. Domina o gradient."
        field="primary"
        form={form}
        disabled={disabled}
      />
      <CorRow
        label="Secondary"
        tooltip="Cor secundária do BG. Aparece nas bordas do gradient e nos detalhes."
        field="secondary"
        form={form}
        disabled={disabled}
      />
      <CorRow
        label="Accent"
        tooltip="Cor de acento. Usada em outlines, footer, textos de destaque sobre fundo claro."
        field="accent"
        form={form}
        disabled={disabled}
      />

      <p className="text-[11px] text-[color:var(--text-tertiary)]">
        As cores do card (rosa claro) são derivadas dos defaults — edite no schema se precisar.
      </p>
    </section>
  )
}
