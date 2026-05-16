'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TooltipInfo } from '@/components/tooltip-info'
import { LogoSelector } from './logo-selector'
import { ModoGeracaoSelector } from './modo-geracao-selector'
import { SlideBlock, type SlideState } from './slide-block'
import { PreviewCarrossel, type CarrosselSlot } from './preview-carrossel'
import { brandM2 } from '@/lib/brand/m2.brand'
import type { M2LogoOption, M2ModoGeracao, M2TemplateId } from '@/lib/m2/schema'

interface FormCarrosselProps {
  templateId: M2TemplateId
}

const { min: SLIDES_MIN, max: SLIDES_MAX } = brandM2.pipeline.carouselSlidesRange
const DEFAULT_QTD = 3
const COPY_MIN = 10
const COPY_MAX = 2000
const CONTEXTO_MAX = 500
const CTA_MIN = 5
const CTA_MAX = 300
const USO_IMAGENS_MAX = 800

function emptySlide(): SlideState {
  return { copyTexto: '', pngSlots: [] }
}

export function FormCarrossel({ templateId }: FormCarrosselProps) {
  const [logo, setLogo] = React.useState<M2LogoOption>('casinha')
  const [modoGeracao, setModoGeracao] = React.useState<M2ModoGeracao>('ia')
  const [contextoGeral, setContextoGeral] = React.useState('')
  const [ctaFinal, setCtaFinal] = React.useState('')
  const [instrucoesUsoImagens, setInstrucoesUsoImagens] = React.useState('')
  const [slides, setSlides] = React.useState<SlideState[]>(() =>
    Array.from({ length: DEFAULT_QTD }, emptySlide)
  )
  const [generating, setGenerating] = React.useState(false)
  const [previewSlots, setPreviewSlots] = React.useState<CarrosselSlot[]>([])

  const isUpload = modoGeracao === 'upload'

  function onChangeQtd(novaQtd: number) {
    setSlides((prev) => {
      if (novaQtd === prev.length) return prev
      if (novaQtd > prev.length) {
        return [...prev, ...Array.from({ length: novaQtd - prev.length }, emptySlide)]
      }
      return prev.slice(0, novaQtd)
    })
  }

  function updateSlide(idx: number, next: SlideState) {
    setSlides((prev) => prev.map((s, i) => (i === idx ? next : s)))
  }

  const todosSlidesCopyValidos = slides.every(
    (s) => s.copyTexto.length >= COPY_MIN && s.copyTexto.length <= COPY_MAX
  )
  const todosSlidesUploadValidos =
    !isUpload || slides.every((s) => s.pngSlots.filter(Boolean).length > 0)
  const ctaValido = ctaFinal.trim().length >= CTA_MIN && ctaFinal.trim().length <= CTA_MAX
  const isValid = todosSlidesCopyValidos && todosSlidesUploadValidos && ctaValido && !generating

  async function onGenerate() {
    if (!isValid) return
    setGenerating(true)
    setPreviewSlots(slides.map(() => ({ state: 'loading' })))

    try {
      const res = await fetch('/api/imagens/m2/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          modo: 'carrossel',
          templateId,
          logo,
          modoGeracao,
          contextoGeral: contextoGeral.trim() || undefined,
          ctaFinal: ctaFinal.trim(),
          instrucoesUsoImagens: isUpload && instrucoesUsoImagens.trim()
            ? instrucoesUsoImagens.trim()
            : undefined,
          slides: slides.map((s) => ({
            copyTexto: s.copyTexto.trim(),
            pngUrls: (() => {
              const pngs = s.pngSlots.filter((u): u is string => !!u)
              return pngs.length > 0 ? pngs : undefined
            })(),
          })),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !Array.isArray(json.urls)) {
        throw new Error(json.error || `Falha (${res.status})`)
      }
      // API resolve em paralelo e devolve URLs na mesma ordem dos slides.
      setPreviewSlots(
        slides.map((_, i) => {
          const url: string | undefined = json.urls[i]
          return url
            ? { state: 'ready', url }
            : { state: 'error', errorMsg: 'Slide sem URL no retorno.' }
        })
      )
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Falha ao gerar'
      setPreviewSlots(slides.map(() => ({ state: 'error', errorMsg })))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* LogoSelector só aparece em T2/T3 — T1 não aplica footer programático */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ModoGeracaoSelector value={modoGeracao} onChange={setModoGeracao} disabled={generating} />
        {templateId !== 'atual-maio26' && (
          <LogoSelector value={logo} onChange={setLogo} disabled={generating} />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-medium">
            Contexto/tema do carrossel (opcional)
            <TooltipInfo text="Tema comum a todos os slides. Ex.: 'campanha Dia das Mães', '5 motivos pra escolher Charme'. Prefixado ao copy de cada slide. Máx. 500." />
          </label>
          <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
            {contextoGeral.length}/{CONTEXTO_MAX}
          </span>
        </div>
        <Textarea
          value={contextoGeral}
          onChange={(e) => setContextoGeral(e.target.value)}
          maxLength={CONTEXTO_MAX}
          placeholder="Ex.: campanha Dia das Mães — tom acolhedor, foco em casa."
          rows={3}
          disabled={generating}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-xs font-medium">
            Quantidade de slides
            <TooltipInfo text={`Entre ${SLIDES_MIN} e ${SLIDES_MAX} slides. Cada slide é uma geração independente (~$0.19 cada em tier high).`} />
          </label>
          <select
            value={slides.length}
            onChange={(e) => onChangeQtd(Number(e.target.value))}
            disabled={generating}
            className="h-10 w-full max-w-[160px] rounded-md border border-[color:var(--border-strong)] bg-white px-3 text-sm outline-none focus:border-[#553679] focus:ring-2 focus:ring-[#553679]/15"
          >
            {Array.from({ length: SLIDES_MAX - SLIDES_MIN + 1 }, (_, i) => SLIDES_MIN + i).map((n) => (
              <option key={n} value={n}>
                {n} slides
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-medium">
              CTA do último slide
              <TooltipInfo text="Frase de ação anexada ao último slide com instrução pra IA exibir em destaque. Ex.: 'Salva pra não esquecer'. Mín. 5 / máx. 300." />
            </label>
            <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
              {ctaFinal.length}/{CTA_MAX}
            </span>
          </div>
          <Textarea
            value={ctaFinal}
            onChange={(e) => setCtaFinal(e.target.value)}
            maxLength={CTA_MAX}
            placeholder="Ex.: Salva pra não esquecer ou Compre agora no nosso site."
            rows={2}
            disabled={generating}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {slides.map((slide, i) => (
          <SlideBlock
            key={i}
            index={i}
            total={slides.length}
            value={slide}
            onChange={(next) => updateSlide(i, next)}
            modoGeracao={modoGeracao}
            disabled={generating}
          />
        ))}
      </div>

      {isUpload && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-medium">
              Instruções de uso das imagens (carrossel)
              <TooltipInfo text="Como referenciar: nome do arquivo + número do slide + função. Ex.: 'No slide 2 use foto-sofa.png como elemento central. No slide 5 use cta-bg.png como fundo do bloco de CTA.' O modelo segue literalmente — seja específico." />
            </label>
            <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
              {instrucoesUsoImagens.length}/{USO_IMAGENS_MAX}
            </span>
          </div>
          <Textarea
            value={instrucoesUsoImagens}
            onChange={(e) => setInstrucoesUsoImagens(e.target.value)}
            maxLength={USO_IMAGENS_MAX}
            placeholder="Ex.: No slide 2 use foto-sofa.png à esquerda do título. No slide 3 use produto.png como elemento central, escala 60%."
            rows={4}
            disabled={generating}
          />
        </div>
      )}

      <div>
        <Button
          type="button"
          variant="brand"
          size="lg"
          disabled={!isValid}
          onClick={onGenerate}
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Gerando {slides.length} slides...
            </>
          ) : (
            `Gerar carrossel (${slides.length} slides)`
          )}
        </Button>
      </div>

      <PreviewCarrossel slots={previewSlots} />
    </div>
  )
}
