'use client'

import { RefreshCw, Loader2, AlertCircle } from 'lucide-react'
import { DownloadButton } from '@/components/download-button'

interface T2PreviewCardProps {
  slideIndex: number
  slideId: string
  url: string | null
  filename: string
  /** Estado de carga do slide individual (loading durante regerar). */
  state: 'idle' | 'loading' | 'error'
  errorMsg?: string
  /** Score QC (mostra badge se < 100). */
  qcScore: number
  qcWarningsCount: number
  onRegerar: () => void
}

export function T2PreviewCard({
  slideIndex,
  slideId,
  url,
  filename,
  state,
  errorMsg,
  qcScore,
  qcWarningsCount,
  onRegerar,
}: T2PreviewCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[color:var(--border-subtle)] bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] font-medium text-[color:var(--text-secondary)]">
            Slide {slideIndex + 1}
          </span>
          <span className="text-[10.5px] text-[color:var(--text-tertiary)]">{slideId}</span>
        </div>
        {qcScore < 100 && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-medium text-[#A35A00]"
            title={`QC score ${qcScore}/100 · ${qcWarningsCount} alerta${qcWarningsCount > 1 ? 's' : ''}`}
          >
            <AlertCircle size={10} />
            QC {qcScore}
          </span>
        )}
      </div>

      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-md bg-[#FAFAF9]">
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={22} className="animate-spin text-[#553679]" />
            <div className="text-[11px] text-[color:var(--text-secondary)]">Regerando…</div>
          </div>
        )}
        {state === 'error' && (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <AlertCircle size={22} className="text-[#A32D2D]" />
            <div className="text-[11px] text-[#A32D2D]">{errorMsg ?? 'Falha ao gerar'}</div>
          </div>
        )}
        {state === 'idle' && url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`slide ${slideIndex + 1}`} className="h-full w-full object-contain" />
        )}
      </div>

      {state === 'idle' && url && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onRegerar}
            className="inline-flex items-center gap-1 rounded-md border border-[color:var(--border-default)] px-2.5 py-1.5 text-[11.5px] font-medium text-[color:var(--text-primary)] transition hover:bg-black/[0.04]"
          >
            <RefreshCw size={12} />
            Regerar
          </button>
          <DownloadButton url={url} filename={filename} />
        </div>
      )}
    </div>
  )
}
