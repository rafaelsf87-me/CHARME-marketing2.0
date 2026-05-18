'use client'

import * as React from 'react'
import { TemplateGrid } from './template-grid'
import { EmojiPicker } from './emoji-picker'
import { PreviewArea } from './preview-area'
import { UploadField } from '@/components/upload-field'
import { TextFieldWithCounter } from '@/components/text-field-with-counter'
import { TooltipInfo } from '@/components/tooltip-info'
import { KeywordField } from '@/components/shared/keyword-field'
import { brandM4 } from '@/lib/brand/m4.brand'
import {
  M4RenderSchema,
  templateHas3Linhas,
  type M4Template,
  type M4RenderInput,
} from '@/lib/m4/schema'
import { M4_TOOLTIPS } from '@/lib/m4/tooltips'
import { Sparkles } from 'lucide-react'

type PreviewState = 'empty' | 'loading' | 'ready' | 'error'

export function M4Form() {
  const [template, setTemplate] = React.useState<M4Template | null>(null)
  const [frameUrl, setFrameUrl] = React.useState<string | null>(null)
  const [line1, setLine1] = React.useState('')
  const [line2, setLine2] = React.useState('')
  const [line3, setLine3] = React.useState('')
  const [iconUrl, setIconUrl] = React.useState<string | null>(null)
  const [customization, setCustomization] = React.useState('')
  const [keyword, setKeyword] = React.useState('')

  const [previewState, setPreviewState] = React.useState<PreviewState>('empty')
  const [resultUrl, setResultUrl] = React.useState<string | null>(null)
  const [stubFlag, setStubFlag] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [normalizedKeyword, setNormalizedKeyword] = React.useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = React.useState<string | null>(null)

  const has3 = template ? templateHas3Linhas(template) : false

  React.useEffect(() => {
    if (!has3 && line3 !== '') setLine3('')
  }, [has3, line3])

  const isValid = React.useMemo(() => {
    if (!template || !frameUrl) return false
    if (!line1.trim() || !line2.trim()) return false
    if (has3 && !line3.trim()) return false
    return true
  }, [template, frameUrl, line1, line2, line3, has3])

  async function onGenerate() {
    if (!isValid || !template || !frameUrl) return
    setPreviewState('loading')
    setErrorMsg(null)
    setResultUrl(null)
    setStubFlag(false)
    setNormalizedKeyword(null)
    setGeneratedAt(null)

    const payload: M4RenderInput = {
      template,
      frameBlobUrl: frameUrl,
      line1: line1.trim(),
      line2: line2.trim(),
      line3: has3 ? line3.trim() : undefined,
      iconUrl: iconUrl ?? undefined,
      customization: customization.trim() || undefined,
      keyword: keyword.trim() || undefined,
    }

    const localCheck = M4RenderSchema.safeParse(payload)
    if (!localCheck.success) {
      setPreviewState('error')
      setErrorMsg(localCheck.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    try {
      const res = await fetch('/api/imagens/m4/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        setPreviewState('error')
        setErrorMsg(json.error || 'Falha ao gerar thumbnail')
        return
      }
      setResultUrl(json.url)
      setStubFlag(Boolean(json.stub))
      setNormalizedKeyword(typeof json.normalizedKeyword === 'string' ? json.normalizedKeyword : null)
      setGeneratedAt(typeof json.generatedAt === 'string' ? json.generatedAt : null)
      setPreviewState('ready')
    } catch (err) {
      setPreviewState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erro de rede')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <TemplateGrid value={template} onChange={setTemplate} />

        <UploadField
          label="Envie o frame do vídeo"
          hint="PNG ou JPG · proporção 9:16 · até 10MB"
          value={frameUrl}
          onChange={setFrameUrl}
        />
        <div className="-mt-5 flex items-center gap-2 text-[11px] text-[color:var(--text-tertiary)]">
          <TooltipInfo text={M4_TOOLTIPS.frame} />
          <span>O frame é o fundo do thumbnail.</span>
        </div>

        <div className="flex flex-col gap-3.5">
          <TextFieldWithCounter
            label="Linha 1 — caixa branca"
            tooltipText={M4_TOOLTIPS.line1}
            colorIndicator={brandM4.palette.box1}
            maxLength={brandM4.limits.line1MaxChars}
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            placeholder="Texto principal"
          />

          <TextFieldWithCounter
            label="Linha 2 — caixa roxa"
            tooltipText={M4_TOOLTIPS.line2}
            colorIndicator={brandM4.palette.box2}
            maxLength={brandM4.limits.line2MaxChars}
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
            placeholder="Texto secundário"
          />

          {has3 && (
            <div className="animate-fade-in">
              <TextFieldWithCounter
                label="Linha 3 — caixa verde"
                tooltipText={M4_TOOLTIPS.line3}
                colorIndicator={brandM4.palette.box3}
                maxLength={brandM4.limits.line3MaxChars}
                value={line3}
                onChange={(e) => setLine3(e.target.value)}
                placeholder="Terceiro texto"
              />
            </div>
          )}
        </div>

        <EmojiPicker value={iconUrl} onChange={setIconUrl} />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Customização / Ideia (opcional)</span>
            <TooltipInfo text={M4_TOOLTIPS.customization} />
          </div>
          <textarea
            value={customization}
            onChange={(e) => setCustomization(e.target.value)}
            placeholder="Ex: aumentar brilho, mais contraste"
            maxLength={500}
            rows={3}
            className="w-full resize-y rounded-md border border-[color:var(--border-strong)] bg-white px-3 py-2 text-sm outline-none focus:border-[#553679] focus:ring-2 focus:ring-[#553679]/15"
          />
        </div>

      <KeywordField
        value={keyword}
        onChange={setKeyword}
        fallbackHint={line1.trim().split(/\s+/)[0] || 'ex.: novidade, descontao'}
        disabled={previewState === 'loading'}
      />

      <div className="flex items-center justify-end gap-3">
        {!isValid && (
          <div className="text-[11.5px] text-[color:var(--text-tertiary)]">
            Preencha template, frame e linhas obrigatórias.
          </div>
        )}
        <button
          type="button"
          onClick={onGenerate}
          disabled={!isValid || previewState === 'loading'}
          className="inline-flex items-center gap-2 rounded-lg bg-[#553679] px-5 py-2.5 text-[13.5px] font-medium text-white transition hover:bg-[#46295F] disabled:cursor-not-allowed disabled:bg-[#C7BCD6] disabled:text-white/90"
        >
          <Sparkles size={14} />
          {previewState === 'loading' ? 'Gerando...' : 'Gerar thumbnail'}
        </button>
      </div>

      {previewState !== 'empty' && (
        <div className="max-w-[420px]">
          <PreviewArea
            state={previewState}
            url={resultUrl}
            isStub={stubFlag}
            errorMsg={errorMsg}
            normalizedKeyword={normalizedKeyword}
            generatedAt={generatedAt}
          />
        </div>
      )}
    </div>
  )
}
