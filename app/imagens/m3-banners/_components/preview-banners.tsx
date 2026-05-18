'use client'

import Image from 'next/image'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DownloadButton } from '@/components/download-button'
import { buildDownloadFilename } from '@/lib/filename'
import type { M3Output } from '@/lib/m3/schema'

interface PreviewBannersProps {
  output: M3Output
  onReset: () => void
}

export function PreviewBanners({ output, onReset }: PreviewBannersProps) {
  const generatedDate = output.generatedAt ? new Date(output.generatedAt) : new Date()
  const desktopFilename = buildDownloadFilename({
    slide: { kind: 'm3', formato: 'desktop' },
    keyword: output.normalizedKeyword,
    extension: 'webp',
    date: generatedDate,
  })
  const mobileFilename = buildDownloadFilename({
    slide: { kind: 'm3', formato: 'mobile' },
    keyword: output.normalizedKeyword,
    extension: 'webp',
    date: generatedDate,
  })

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-[#16A34A]/30 bg-[#F0FDF4] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-[color:var(--text-primary)]">
          Banners prontos · custo $ {output.custoEstimado.toFixed(2)}
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          <RotateCcw size={14} /> Gerar novamente
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Desktop card */}
        <div className="flex flex-col gap-3 rounded-md border border-[color:var(--border-default)] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[color:var(--text-secondary)]">
              Desktop · 1920×550
            </span>
          </div>
          <div className="relative w-full overflow-hidden rounded border border-[color:var(--border-default)] bg-black/5 aspect-[1920/550]">
            <Image
              src={output.desktopUrl}
              alt="Banner desktop"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-contain"
              unoptimized
            />
          </div>
          <DownloadButton
            url={output.desktopUrl}
            filename={desktopFilename}
            label="Download desktop (.webp)"
          />
        </div>

        {/* Mobile card */}
        <div className="flex flex-col gap-3 rounded-md border border-[color:var(--border-default)] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[color:var(--text-secondary)]">
              Mobile · 800×600
            </span>
          </div>
          <div className="relative w-full overflow-hidden rounded border border-[color:var(--border-default)] bg-black/5 aspect-[800/600]">
            <Image
              src={output.mobileUrl}
              alt="Banner mobile"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-contain"
              unoptimized
            />
          </div>
          <DownloadButton
            url={output.mobileUrl}
            filename={mobileFilename}
            label="Download mobile (.webp)"
          />
        </div>
      </div>

      <p className="text-[11px] text-[color:var(--text-tertiary)]">
        Gerado em {new Date(output.generatedAt).toLocaleString('pt-BR')}. Arquivos ficam disponíveis
        temporariamente — baixe agora se quiser guardar.
      </p>
    </section>
  )
}
