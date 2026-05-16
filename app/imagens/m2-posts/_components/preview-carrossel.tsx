'use client'

import * as React from 'react'
import { Loader2, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { DownloadButton } from '@/components/download-button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type CarrosselSlotState = 'loading' | 'ready' | 'error'

export interface CarrosselSlot {
  state: CarrosselSlotState
  url?: string
  errorMsg?: string
}

interface PreviewCarrosselProps {
  slots: CarrosselSlot[]
}

export function PreviewCarrossel({ slots }: PreviewCarrosselProps) {
  const [active, setActive] = React.useState(0)
  const safeActive = Math.min(active, Math.max(0, slots.length - 1))
  const current = slots[safeActive]

  async function baixarTudo() {
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]
      if (s.state !== 'ready' || !s.url) continue
      try {
        const res = await fetch(s.url)
        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = `m2-carrossel-${Date.now()}-slide-${i + 1}.png`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(objectUrl)
      } catch {
        window.open(s.url, '_blank')
      }
    }
  }

  const todosProntos = slots.length > 0 && slots.every((s) => s.state === 'ready' && s.url)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium">Preview do Carrossel</div>
        <div className="text-[11px] text-[color:var(--text-tertiary)]">
          Slide {slots.length > 0 ? safeActive + 1 : 0} de {slots.length}
        </div>
      </div>

      <div className="flex items-stretch gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setActive((i) => Math.max(0, i - 1))}
          disabled={safeActive === 0}
        >
          <ChevronLeft size={16} />
        </Button>

        <div className="flex aspect-[4/5] w-full max-w-[420px] items-center justify-center overflow-hidden rounded-lg border border-[color:var(--border-default)] bg-[#F4F4F2]">
          {!current && (
            <div className="flex flex-col items-center gap-2 text-[color:var(--text-tertiary)]">
              <ImageIcon size={28} />
              <span className="text-xs">As imagens aparecem aqui</span>
            </div>
          )}
          {current?.state === 'loading' && (
            <div className="flex flex-col items-center gap-2 text-[#553679]">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-xs">Gerando slide {safeActive + 1}...</span>
            </div>
          )}
          {current?.state === 'ready' && current.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.url} alt={`Slide ${safeActive + 1}`} className="h-full w-full object-cover" />
          )}
          {current?.state === 'error' && (
            <div className="flex flex-col items-center gap-2 px-6 text-center text-[#A32D2D]">
              <ImageIcon size={28} />
              <span className="text-xs">{current.errorMsg || 'Falha ao gerar este slide.'}</span>
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setActive((i) => Math.min(slots.length - 1, i + 1))}
          disabled={safeActive >= slots.length - 1}
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      {slots.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {slots.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'h-7 min-w-7 rounded-md border px-2 text-[11px] font-medium transition',
                i === safeActive
                  ? 'border-[#553679] bg-[#EEEDFE] text-[#553679]'
                  : 'border-[color:var(--border-default)] bg-white text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)]',
                s.state === 'error' && 'border-[#A32D2D] text-[#A32D2D]'
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {current?.state === 'ready' && current.url && (
        <div className="flex flex-wrap gap-2">
          <DownloadButton
            url={current.url}
            filename={`m2-carrossel-${Date.now()}-slide-${safeActive + 1}.png`}
            label={`Baixar Slide ${safeActive + 1}`}
          />
          {todosProntos && (
            <Button type="button" variant="brand" onClick={baixarTudo}>
              Baixar Tudo
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
