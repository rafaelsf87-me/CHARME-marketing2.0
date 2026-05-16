'use client'

import { cn } from '@/lib/utils'

export type M2Tab = 'imagem-unica' | 'carrossel'

interface TabSwitcherProps {
  value: M2Tab
  onChange: (tab: M2Tab) => void
}

const OPCOES: { id: M2Tab; label: string }[] = [
  { id: 'imagem-unica', label: 'Imagem Única' },
  { id: 'carrossel', label: 'Carrossel' },
]

export function TabSwitcher({ value, onChange }: TabSwitcherProps) {
  return (
    <div className="flex w-full gap-1.5 rounded-lg border border-[color:var(--border-default)] bg-[#F4F4F2] p-1">
      {OPCOES.map((opt) => {
        const selected = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-[13px] font-medium transition',
              selected
                ? 'bg-white text-[color:var(--text-primary)] shadow-sm'
                : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
