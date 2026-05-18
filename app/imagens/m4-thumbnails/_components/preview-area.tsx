'use client'

import { ImageIcon, Loader2 } from 'lucide-react'
import { DownloadButton } from '@/components/download-button'
import { buildDownloadFilename } from '@/lib/filename'

interface PreviewAreaProps {
  state: 'empty' | 'loading' | 'ready' | 'error'
  url: string | null
  message?: string
  errorMsg?: string | null
  isStub?: boolean
  normalizedKeyword?: string | null
  generatedAt?: string | null
}

export function PreviewArea({
  state,
  url,
  message,
  errorMsg,
  isStub,
  normalizedKeyword,
  generatedAt,
}: PreviewAreaProps) {
  const filename = buildDownloadFilename({
    slide: { kind: 'm4' },
    keyword: normalizedKeyword,
    extension: 'png',
    date: generatedAt ? new Date(generatedAt) : new Date(),
  })
  return (
    <div className="rounded-lg border border-[color:var(--border-subtle)] bg-white p-5">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="text-xs font-medium">Preview</div>
        {isStub && state === 'ready' && (
          <div className="rounded bg-[#FFF4D6] px-1.5 py-0.5 text-[10.5px] font-medium text-[#7A5A00]">
            stub · render real no Bloco C
          </div>
        )}
      </div>

      <div className="relative flex aspect-[9/16] max-h-[520px] items-center justify-center overflow-hidden rounded-md bg-[#FAFAF9]">
        {state === 'empty' && (
          <div className="flex flex-col items-center gap-2 text-[color:var(--text-tertiary)]">
            <ImageIcon size={26} />
            <div className="text-[12px]">{message || 'Preencha os campos e clique em Gerar.'}</div>
          </div>
        )}
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={22} className="animate-spin text-[#553679]" />
            <div className="text-[12px] text-[color:var(--text-secondary)]">Gerando thumbnail...</div>
          </div>
        )}
        {state === 'ready' && url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Thumbnail gerado" className="h-full w-full object-contain" />
        )}
        {state === 'error' && (
          <div className="px-6 text-center text-[12px] text-[#A32D2D]">
            {errorMsg || 'Falha ao gerar. Tente novamente.'}
          </div>
        )}
      </div>

      {state === 'ready' && url && (
        <div className="mt-3 flex justify-end">
          <DownloadButton url={url} filename={filename} />
        </div>
      )}
    </div>
  )
}
