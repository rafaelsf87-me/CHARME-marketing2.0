'use client'

import { listTemplates } from '@/lib/m2/templates'
import type { M2TemplateId } from '@/lib/m2/schema'
import type { TemplateStatus } from '@/lib/m2/templates/types'
import { cn } from '@/lib/utils'

interface TemplateSelectorProps {
  value: M2TemplateId
  onChange: (id: M2TemplateId) => void
}

const STATUS_BADGE: Record<TemplateStatus, { label: string; className: string }> = {
  ativo: { label: 'Ativo', className: 'bg-[#E6F9F4] text-[#1F8A6F]' },
  'em-construcao': { label: 'Em construção', className: 'bg-[#FDF0D5] text-[#8A5B1F]' },
  'a-definir': { label: 'A definir', className: 'bg-[#EEEEEC] text-[color:var(--text-tertiary)]' },
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  const templates = listTemplates()

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium">Template</div>
      <div className="grid grid-cols-3 gap-3">
        {templates.map((tpl) => {
          const disabled = tpl.status !== 'ativo'
          const selected = !disabled && tpl.id === value
          const badge = STATUS_BADGE[tpl.status]
          return (
            <button
              key={tpl.id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(tpl.id as M2TemplateId)}
              aria-pressed={selected}
              className={cn(
                'flex flex-col items-start gap-2 rounded-lg border bg-white p-3 text-left transition',
                selected
                  ? 'border-[#553679] ring-2 ring-[#553679]/15'
                  : 'border-[color:var(--border-default)]',
                disabled
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:border-[color:var(--border-strong)]'
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-[13px] font-medium">{tpl.nome}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-medium',
                    badge.className
                  )}
                >
                  {badge.label}
                </span>
              </div>
              <p
                className="line-clamp-1 w-full truncate text-[11.5px] leading-snug text-[color:var(--text-secondary)]"
                title={tpl.descricao}
              >
                {tpl.descricao}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
