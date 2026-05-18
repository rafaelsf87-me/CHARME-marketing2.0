'use client'

import * as React from 'react'
import Image from 'next/image'
import { Lock } from 'lucide-react'
import { M3_TEMPLATES } from '@/lib/m3/templates'
import type { M3Input } from '@/lib/m3/schema'

interface TemplateSelectorProps {
  value: M3Input['template']
  onChange: (id: M3Input['template']) => void
  disabled?: boolean
}

const THUMBS: Record<string, string | null> = {
  'atual-maio26': '/brand/m3/template-thumbs/atual-maio26.webp',
  'novo-teste-1': null,
  'novo-teste-2': null,
}

export function TemplateSelector({ value, onChange, disabled }: TemplateSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-[color:var(--text-primary)]">Template</h2>
      <div className="grid max-w-[680px] gap-3 sm:grid-cols-3">
        {M3_TEMPLATES.map((tpl) => {
          const isActive = tpl.status === 'ativo'
          const isSelected = value === tpl.id && isActive
          const thumb = THUMBS[tpl.id]
          const badge =
            tpl.status === 'placeholder'
              ? tpl.id === 'novo-teste-1'
                ? 'Em construção'
                : 'A definir'
              : null

          return (
            <button
              key={tpl.id}
              type="button"
              disabled={!isActive || disabled}
              onClick={() => isActive && onChange(tpl.id as M3Input['template'])}
              title={
                isActive
                  ? tpl.descricao
                  : 'Disponível em breve'
              }
              className={[
                'group flex flex-col overflow-hidden rounded-md border bg-white text-left transition',
                isSelected
                  ? 'border-[#553679] ring-2 ring-[#553679]/30'
                  : 'border-[color:var(--border-default)]',
                isActive
                  ? 'cursor-pointer hover:border-[#553679]'
                  : 'cursor-not-allowed opacity-60',
              ].join(' ')}
            >
              <div className="relative aspect-[1920/550] w-full bg-[color:var(--bg-tertiary)]">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={tpl.nome}
                    fill
                    sizes="(min-width: 640px) 220px, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[color:var(--text-tertiary)]">
                    <Lock size={22} />
                  </div>
                )}
                {badge && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-white">
                    {badge}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 px-2 py-1.5">
                <span className="text-[12px] font-medium leading-tight text-[color:var(--text-primary)]">{tpl.nome}</span>
                <span className="line-clamp-1 text-[10.5px] text-[color:var(--text-secondary)]">
                  {tpl.descricao}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
