'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { TooltipInfo } from '@/components/tooltip-info'
import { UploadField } from '@/components/upload-field'
import { cn } from '@/lib/utils'
import type { M2ModoGeracao } from '@/lib/m2/schema'

const COPY_MIN = 10
const COPY_MAX = 2000
const PROMPT_IMAGEM_MAX = 500

export interface SlideState {
  copyTexto: string
  pngUrl: string | null
  promptImagem: string
}

interface SlideBlockProps {
  index: number
  total: number
  value: SlideState
  onChange: (next: SlideState) => void
  /** Modo de geração do carrossel — afeta obrigatoriedade do upload. */
  modoGeracao: M2ModoGeracao
  disabled?: boolean
}

/**
 * Bloco de slide do carrossel (hotfix UX 18/05/2026).
 * - 1 imagem por slide (era array, simplificou)
 * - Textarea `promptImagem` por slide (substitui instrucoesUsoImagens global)
 * - Collapsed por default (K, hotfix v8) — badges no header dão visão geral
 *   de pendências sem precisar expandir todos os slides
 * - Badges de pendência (copy < 10, imagem obrigatória em upload)
 */
export function SlideBlock({
  index,
  total,
  value,
  onChange,
  modoGeracao,
  disabled,
}: SlideBlockProps) {
  const [expanded, setExpanded] = React.useState(false)
  const copyLen = value.copyTexto.length
  const isLast = index === total - 1
  const isUpload = modoGeracao === 'upload'
  const copyPendente = copyLen < COPY_MIN
  const uploadPendente = isUpload && !value.pngUrl

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
          {copyPendente && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-medium text-[#A35A00]">
              <AlertTriangle size={10} />
              Copy pendente
            </span>
          )}
          {uploadPendente && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4E5] px-2 py-0.5 text-[10px] font-medium text-[#A35A00]">
              <AlertTriangle size={10} />
              Imagem obrigatória
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
            Imagem do Slide {isUpload ? '(obrigatória)' : '(opcional)'}
            <TooltipInfo
              text={
                isUpload
                  ? 'Modo upload: 1 PNG/JPG obrigatório por slide. IA usa como referência visual.'
                  : 'Opcional. PNG/JPG que a IA usa como referência. Sem imagem, IA compõe livre a partir do copy.'
              }
            />
          </label>
          <UploadField
            label=""
            hint="PNG/JPG · até 10MB"
            value={value.pngUrl}
            onChange={(next) => onChange({ ...value, pngUrl: next })}
            disabled={disabled}
            className="max-w-[260px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-medium">
              Prompt da imagem (opcional)
              <TooltipInfo text="Instrução de como a IA deve usar a imagem deste slide. Ex.: 'elemento central, escala 60%', 'fundo translúcido', 'manter cores originais'. Máx. 500." />
            </label>
            <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
              {value.promptImagem.length}/{PROMPT_IMAGEM_MAX}
            </span>
          </div>
          <Textarea
            value={value.promptImagem}
            onChange={(e) => onChange({ ...value, promptImagem: e.target.value })}
            maxLength={PROMPT_IMAGEM_MAX}
            placeholder="Ex.: usar como elemento central, escala 60%, sem alterar cores."
            rows={3}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
