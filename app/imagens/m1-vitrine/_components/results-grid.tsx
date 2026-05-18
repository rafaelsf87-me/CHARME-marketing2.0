'use client'

import { ImageIcon, Loader2, RotateCcw, RefreshCw } from 'lucide-react'
import { DownloadButton } from '@/components/download-button'
import type { M1RenderInput, M1TipoFoto } from '@/lib/m1/schema'

export type SlotState =
  | { state: 'loading' }
  | { state: 'ready'; url: string; tookMs: number }
  | { state: 'error'; message: string }

export interface ResultSlot {
  tipoFoto: M1TipoFoto
  status: SlotState
  contextoOriginal?: M1RenderInput
}

const LABELS: Record<M1TipoFoto, string> = {
  capa: 'Foto Capa',
  ambiente: 'Foto Ambiente',
  elastico: 'Foto Elástico',
  'detalhe-tecido': 'Detalhe do Tecido',
  // Vestindo a Capa: backend pronto (em construção, sem checkbox na UI).
  // Ver DIVIDAS_PROJETO.md REF-005.
  'vestindo-capa': 'Vestindo a Capa',
}

interface ResultsGridProps {
  slots: ResultSlot[]
  onRetry: (index: number) => void
  onRegerar: (index: number) => void
}

export function ResultsGrid({ slots, onRetry, onRegerar }: ResultsGridProps) {
  if (slots.length === 0) return null

  // 1 → 1 coluna; 2+ → grid 2 colunas; ≥3 → grid 2 colunas (1 quebra em linha).
  const cols = slots.length === 1 ? 'grid-cols-1 max-w-[520px]' : 'grid-cols-1 sm:grid-cols-2'

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <div className="text-xs font-medium">Resultados</div>
      <div className={`grid gap-3 ${cols}`}>
        {slots.map((slot, idx) => (
          <ResultCard
            key={`${slot.tipoFoto}-${idx}`}
            slot={slot}
            label={LABELS[slot.tipoFoto]}
            onRetry={() => onRetry(idx)}
            onRegerar={() => onRegerar(idx)}
          />
        ))}
      </div>
    </div>
  )
}

function ResultCard({
  slot,
  label,
  onRetry,
  onRegerar,
}: {
  slot: ResultSlot
  label: string
  onRetry: () => void
  onRegerar: () => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[color:var(--border-subtle)] bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="text-[11.5px] font-medium text-[color:var(--text-secondary)]">{label}</div>
        {slot.status.state === 'ready' && (
          <div className="text-[10.5px] text-[color:var(--text-tertiary)]">
            {(slot.status.tookMs / 1000).toFixed(1)}s
          </div>
        )}
      </div>

      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md bg-[#FAFAF9]">
        {slot.status.state === 'loading' && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={22} className="animate-spin text-[#553679]" />
            <div className="text-[11px] text-[color:var(--text-secondary)]">Gerando...</div>
          </div>
        )}
        {slot.status.state === 'ready' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slot.status.url}
            alt={label}
            className="h-full w-full object-contain"
          />
        )}
        {slot.status.state === 'error' && (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <ImageIcon size={22} className="text-[#A32D2D]" />
            <div className="text-[11px] text-[#A32D2D]">{slot.status.message}</div>
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 inline-flex items-center gap-1 rounded-md border border-[#553679] px-2 py-1 text-[11px] font-medium text-[#553679] hover:bg-[#EEEDFE]"
            >
              <RotateCcw size={11} /> Tentar novamente
            </button>
          </div>
        )}
      </div>

      {slot.status.state === 'ready' && (
        <div className="flex items-center justify-end gap-2">
          {slot.contextoOriginal && (
            <button
              type="button"
              onClick={onRegerar}
              className="inline-flex items-center gap-1 rounded-md border border-[color:var(--border-default)] px-2.5 py-1.5 text-[11.5px] font-medium text-[color:var(--text-primary)] transition hover:bg-black/[0.04]"
            >
              <RefreshCw size={12} />
              Regerar
            </button>
          )}
          <DownloadButton
            url={slot.status.url}
            filename={`m1-${slot.tipoFoto}.webp`}
          />
        </div>
      )}
    </div>
  )
}
