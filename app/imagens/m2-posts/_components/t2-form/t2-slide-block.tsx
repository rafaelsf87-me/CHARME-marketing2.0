'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { TooltipInfo } from '@/components/tooltip-info'
import { UploadField } from '@/components/upload-field'
import { cn } from '@/lib/utils'

const COPY_MIN = 10
const COPY_MAX = 2000
const PROMPT_MAX = 500

export interface T2SlideState {
  copyTexto: string
  imageMainUploadUrl: string | null
  imageMainPrompt: string
}

interface T2SlideBlockProps {
  index: number
  total: number
  value: T2SlideState
  onChange: (next: T2SlideState) => void
  /** Carrossel: 1º slide é cover (cover não tem imageSlot). */
  isCover: boolean
  /** Carrossel: último slide é cta-final (cta-final não tem imageSlot). */
  isCtaFinal: boolean
  disabled?: boolean
}

export function T2SlideBlock({
  index,
  total,
  value,
  onChange,
  isCover,
  isCtaFinal,
  disabled,
}: T2SlideBlockProps) {
  const [expanded, setExpanded] = React.useState(index === 0)
  const copyLen = value.copyTexto.length
  const copyPendente = copyLen < COPY_MIN
  const showImageSlot = !isCover && !isCtaFinal

  const slideLabel = isCover
    ? `Slide ${index + 1} (capa)`
    : isCtaFinal
      ? `Slide ${index + 1} (CTA final)`
      : `Slide ${index + 1}`

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
            {slideLabel}
            {index === total - 1 && total > 1 && !isCtaFinal && (
              <span className="ml-1.5 text-[10px] font-medium text-[#553679]">(final)</span>
            )}
          </span>
          {copyPendente && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-medium text-[#A35A00]">
              <AlertTriangle size={10} />
              Copy pendente
            </span>
          )}
        </div>
        <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
          {copyLen}/{COPY_MAX} caracteres
        </span>
      </button>

      <div
        className={cn(
          'flex flex-col gap-4 border-t border-[color:var(--border-default)] bg-white p-4',
          !expanded && 'hidden',
        )}
      >
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-xs font-medium">
            Copy do slide {index + 1}
            <TooltipInfo text="Texto que define o slide. Pra capa: linha 1 = título, demais linhas = subtítulo. Pra content: 1 título + bullets (uma por linha). Pra comparison: linha 1 = título, demais opcionais. Pra CTA final: linha 1 = título principal." />
          </label>
          <Textarea
            value={value.copyTexto}
            onChange={(e) => onChange({ ...value, copyTexto: e.target.value })}
            maxLength={COPY_MAX}
            placeholder={
              index === 0
                ? 'Ex.: Você sabia que a capa elástica veste qualquer sofá?\n\nVeja como.'
                : `Ex.: motivo ${index + 1} ou continuação narrativa.`
            }
            rows={5}
            disabled={disabled}
          />
        </div>

        {showImageSlot && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-xs font-medium">
                Imagem (opcional)
                <TooltipInfo text="Upload de imagem do produto/cena. Política T2: upload é asset pronto — usado direto, sem IA. Se vazio, IA gera com base no prompt abaixo." />
              </label>
              <UploadField
                label=""
                hint="PNG/JPG · até 10MB"
                value={value.imageMainUploadUrl}
                onChange={(next) => onChange({ ...value, imageMainUploadUrl: next })}
                disabled={disabled}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium">
                  Prompt da imagem (opcional, se IA)
                  <TooltipInfo text="Descrição do produto/cena pra IA gerar (gpt-image-1 high). Se 'Imagem' acima estiver preenchida, este campo é ignorado." />
                </label>
                <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
                  {value.imageMainPrompt.length}/{PROMPT_MAX}
                </span>
              </div>
              <Textarea
                value={value.imageMainPrompt}
                onChange={(e) => onChange({ ...value, imageMainPrompt: e.target.value })}
                maxLength={PROMPT_MAX}
                placeholder="Ex.: nova bucha amarela com esfregão verde, fundo neutro"
                disabled={disabled || !!value.imageMainUploadUrl}
                className="h-40 resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
