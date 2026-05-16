'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { TooltipInfo } from '@/components/tooltip-info'
import { PngUploadList } from './png-upload-list'
import { cn } from '@/lib/utils'
import type { M2ModoGeracao } from '@/lib/m2/schema'

const COPY_MAX = 2000

export interface SlideState {
  copyTexto: string
  pngSlots: (string | null)[]
}

interface SlideBlockProps {
  index: number
  total: number
  value: SlideState
  onChange: (next: SlideState) => void
  /** Modo de geração do carrossel — afeta limites e obrigatoriedade do PNG slot 1. */
  modoGeracao: M2ModoGeracao
  disabled?: boolean
}

export function SlideBlock({
  index,
  total,
  value,
  onChange,
  modoGeracao,
  disabled,
}: SlideBlockProps) {
  const [expanded, setExpanded] = React.useState(index === 0)
  const copyLen = value.copyTexto.length
  const isLast = index === total - 1
  const isUpload = modoGeracao === 'upload'
  const maxSlots = isUpload ? 8 : 3

  return (
    <div className="overflow-hidden rounded-lg border border-[color:var(--border-default)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 bg-[#F4F4F2] px-3 py-2.5 text-left hover:bg-[#EEEEEC]"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="text-[13px] font-medium">
            Slide {index + 1}
            {isLast && total > 1 && (
              <span className="ml-1.5 text-[10px] font-medium text-[#553679]">(final)</span>
            )}
          </span>
        </div>
        <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
          {copyLen}/{COPY_MAX} · {value.pngSlots.filter(Boolean).length} ref(s)
        </span>
      </button>

      <div
        className={cn(
          'flex flex-col gap-4 border-t border-[color:var(--border-default)] bg-white p-4',
          !expanded && 'hidden'
        )}
      >
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-xs font-medium">
            Copy do slide {index + 1}
            <TooltipInfo text="Texto exato que a IA usa neste slide. Mín. 10 / máx. 2000 caracteres. No último slide, a CTA final é anexada automaticamente." />
          </label>
          <Textarea
            value={value.copyTexto}
            onChange={(e) => onChange({ ...value, copyTexto: e.target.value })}
            maxLength={COPY_MAX}
            placeholder={
              index === 0
                ? 'Ex.: Você sabia que a capa elástica veste qualquer sofá?'
                : `Ex.: motivo ${index + 1} ou continuação narrativa.`
            }
            rows={4}
            disabled={disabled}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-xs font-medium">
            PNGs de referência {isUpload ? '(1-8 · obrigatório)' : '(opcional · até 3)'}
            <TooltipInfo
              text={
                isUpload
                  ? 'Modo upload: cada slide exige no mínimo 1 PNG. Até 8 por slide. Referencie por nome no campo global "Instruções de uso das imagens".'
                  : 'Referências visuais específicas deste slide. Sem PNGs, a IA usa só o copy.'
              }
            />
          </label>
          <PngUploadList
            value={value.pngSlots}
            onChange={(next) => onChange({ ...value, pngSlots: next })}
            maxSlots={maxSlots}
            firstRequired={isUpload}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
