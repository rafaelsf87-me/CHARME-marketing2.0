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
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-3">
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
                'group flex flex-col overflow-hidden rounded-lg border bg-white text-left transition',
                isSelected
                  ? 'border-[#E91E63] ring-2 ring-[#E91E63] ring-offset-2'
                  : 'border-[color:var(--border-default)]',
                isActive
                  ? 'hover:border-[#E91E63] cursor-pointer'
                  : 'cursor-not-allowed opacity-60',
              ].join(' ')}
            >
              <div className="relative aspect-[1920/550] w-full bg-[color:var(--bg-tertiary)]">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={tpl.nome}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 33vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[color:var(--text-tertiary)]">
                    <Lock size={32} />
                  </div>
                )}
                {badge && (
                  <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                    {badge}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 p-3">
                <span className="text-sm font-medium text-[color:var(--text-primary)]">{tpl.nome}</span>
                <span className="line-clamp-2 text-xs text-[color:var(--text-secondary)]">
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
