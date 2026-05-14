'use client'

import { ImageIcon, Loader2 } from 'lucide-react'
import { DownloadButton } from '@/components/download-button'

interface PreviewAreaProps {
  state: 'empty' | 'loading' | 'ready' | 'error'
  url: string | null
  errorMsg?: string | null
  tookMs?: number | null
}

export function PreviewArea({ state, url, errorMsg, tookMs }: PreviewAreaProps) {
  return (
    <div className="rounded-lg border border-[color:var(--border-subtle)] bg-white p-5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-xs font-medium">Preview</div>
        {state === 'ready' && tookMs != null && (
          <div className="text-[10.5px] text-[color:var(--text-tertiary)]">
            {(tookMs / 1000).toFixed(1)}s
          </div>
        )}
      </div>

      <div className="relative flex aspect-square max-h-[520px] items-center justify-center overflow-hidden rounded-md bg-[#FAFAF9]">
        {state === 'empty' && (
          <div className="flex flex-col items-center gap-2 text-[color:var(--text-tertiary)]">
            <ImageIcon size={26} />
            <div className="text-[12px]">Preencha os campos e clique em Gerar.</div>
          </div>
        )}
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={22} className="animate-spin text-[#553679]" />
            <div className="text-[12px] text-[color:var(--text-secondary)]">
              Gerando foto... (8–18s)
            </div>
          </div>
        )}
        {state === 'ready' && url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Foto gerada" className="h-full w-full object-contain" />
        )}
        {state === 'error' && (
          <div className="px-6 text-center text-[12px] text-[#A32D2D]">
            {errorMsg || 'Falha ao gerar. Tente novamente.'}
          </div>
        )}
      </div>

      {state === 'ready' && url && (
        <div className="mt-3 flex justify-end">
          <DownloadButton url={url} filename="foto-m1.webp" />
        </div>
      )}
    </div>
  )
}
