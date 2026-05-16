'use client'

import { Loader2, ImageIcon } from 'lucide-react'
import { DownloadButton } from '@/components/download-button'

interface PreviewImagemUnicaProps {
  state: 'empty' | 'loading' | 'ready' | 'error'
  url?: string
  errorMsg?: string
}

export function PreviewImagemUnica({ state, url, errorMsg }: PreviewImagemUnicaProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-medium">Preview</div>
      <div className="flex aspect-[4/5] w-full max-w-[420px] items-center justify-center overflow-hidden rounded-lg border border-[color:var(--border-default)] bg-[#F4F4F2]">
        {state === 'empty' && (
          <div className="flex flex-col items-center gap-2 text-[color:var(--text-tertiary)]">
            <ImageIcon size={28} />
            <span className="text-xs">A imagem aparece aqui</span>
          </div>
        )}
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-2 text-[#553679]">
            <Loader2 size={28} className="animate-spin" />
            <span className="text-xs">Gerando imagem... (~30–60s)</span>
          </div>
        )}
        {state === 'ready' && url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Post gerado" className="h-full w-full object-cover" />
        )}
        {state === 'error' && (
          <div className="flex flex-col items-center gap-2 px-6 text-center text-[#A32D2D]">
            <ImageIcon size={28} />
            <span className="text-xs">{errorMsg || 'Falha ao gerar.'}</span>
          </div>
        )}
      </div>
      {state === 'ready' && url && (
        <div>
          <DownloadButton url={url} filename={`m2-post-${Date.now()}.png`} />
        </div>
      )}
    </div>
  )
}
