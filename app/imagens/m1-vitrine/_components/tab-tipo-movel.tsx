'use client'

import type { M1Movel } from '@/lib/m1/schema'
import { cn } from '@/lib/utils'

interface TabTipoMovelProps {
  value: M1Movel
  onChange: (movel: M1Movel) => void
}

const OPCOES: { id: M1Movel; label: string }[] = [
  { id: 'sofa', label: 'Sofá' },
  { id: 'cadeira', label: 'Cadeira' },
]

export function TabTipoMovel({ value, onChange }: TabTipoMovelProps) {
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
