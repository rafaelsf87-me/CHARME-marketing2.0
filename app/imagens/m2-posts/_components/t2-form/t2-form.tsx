'use client'

import * as React from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { TabSwitcher, type M2Tab } from '../tab-switcher'
import { TooltipInfo } from '@/components/tooltip-info'
import { Textarea } from '@/components/ui/textarea'
import { KeywordField } from '@/components/shared/keyword-field'
import { T2SlideBlock, type T2SlideState } from './t2-slide-block'
import { T2PreviewCard } from './t2-preview-card'
import { T2RegerarDialog } from './t2-regerar-dialog'
import { buildDownloadFilename } from '@/lib/filename'
import type { CarouselAssetPack, QCReport, SlidePlan, T2Input, T2SlideInput } from '@/lib/m2/t2/types'

interface RenderResponse {
  urls: string[]
  slidePlans: SlidePlan[]
  packAssets: CarouselAssetPack | null
  qcReports: QCReport[]
  normalizedKeyword: string
  generatedAt: string
  tookMs: number
  error?: string
}

interface RegerarResponse {
  url: string
  slidePlan: { slideIndex: number; slideId: string; url: string; qc: QCReport }
  slideIndex: number
  qcReport: QCReport
  packAssets: CarouselAssetPack | null
  normalizedKeyword: string
  generatedAt: string
  error?: string
}

const MIN_SLIDES = 2
const MAX_SLIDES = 8
const DEFAULT_SLIDES = 4

function newSlideState(): T2SlideState {
  return { copyTexto: '', imageMainUploadUrl: null, imageMainPrompt: '' }
}

function buildT2InputPayload(args: {
  tab: M2Tab
  contextoGeral: string
  slides: T2SlideState[]
  keyword: string
}): T2Input {
  const baseSlides: T2SlideInput[] = args.slides.map((s) => ({
    copyTexto: s.copyTexto,
    imageMainUploadUrl: s.imageMainUploadUrl ?? undefined,
    imageMainPrompt: s.imageMainPrompt || undefined,
  }))
  return {
    modo: args.tab === 'imagem-unica' ? 'imagem-unica' : 'carrossel',
    templateId: 'pipeline-hibrido-v2',
    logo: 'casinha',
    contextoGeral: args.contextoGeral || undefined,
    slides: baseSlides,
    keyword: args.keyword || undefined,
  }
}

export function T2Form() {
  const [tab, setTab] = React.useState<M2Tab>('carrossel')
  const [numSlides, setNumSlides] = React.useState(DEFAULT_SLIDES)
  const [contextoGeral, setContextoGeral] = React.useState('')
  const [keyword, setKeyword] = React.useState('')
  const [slides, setSlides] = React.useState<T2SlideState[]>(() =>
    Array.from({ length: DEFAULT_SLIDES }, newSlideState),
  )

  const [generating, setGenerating] = React.useState(false)
  const [response, setResponse] = React.useState<RenderResponse | null>(null)
  const [slideStates, setSlideStates] = React.useState<
    Array<{ state: 'idle' | 'loading' | 'error'; errorMsg?: string }>
  >([])

  const [regerarIndex, setRegerarIndex] = React.useState<number | null>(null)
  const [regerarSubmitting, setRegerarSubmitting] = React.useState(false)

  // Sincroniza array de slides com numSlides quando carrossel.
  React.useEffect(() => {
    if (tab === 'imagem-unica') {
      if (slides.length !== 1) setSlides([slides[0] ?? newSlideState()])
      return
    }
    if (slides.length !== numSlides) {
      const next = [...slides]
      while (next.length < numSlides) next.push(newSlideState())
      while (next.length > numSlides) next.pop()
      setSlides(next)
    }
  }, [tab, numSlides, slides])

  const isValid = React.useMemo(() => {
    if (slides.length === 0) return false
    return slides.every((s) => s.copyTexto.trim().length >= 10)
  }, [slides])

  const totalSlides = slides.length

  function fallbackKeywordHint(): string {
    if (contextoGeral.trim()) return contextoGeral.split(/\s+/)[0]
    if (slides[0]?.copyTexto.trim()) return slides[0].copyTexto.split(/\s+/)[0]
    return 'ex.: bucha, floral'
  }

  function downloadFilenameFor(slideIndex: number): string {
    const generatedAt = response?.generatedAt ? new Date(response.generatedAt) : new Date()
    const kw = response?.normalizedKeyword ?? keyword
    const isImagemUnica = tab === 'imagem-unica' && totalSlides === 1
    const variant: `slide${number}` | 'imagem-unica' = isImagemUnica
      ? 'imagem-unica'
      : (`slide${slideIndex + 1}` as `slide${number}`)
    return buildDownloadFilename({
      slide: { kind: 'm2', variant },
      keyword: kw,
      extension: 'png',
      date: generatedAt,
    })
  }

  async function onSubmit() {
    if (!isValid || generating) return
    setGenerating(true)
    setResponse(null)
    setSlideStates(slides.map(() => ({ state: 'idle' as const })))
    try {
      const payload = buildT2InputPayload({ tab, contextoGeral, slides, keyword })
      const res = await fetch('/api/imagens/m2/t2/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await res.json().catch(() => ({}))) as RenderResponse
      if (!res.ok || !json.urls) {
        throw new Error(json.error || `Falha (${res.status})`)
      }
      setResponse(json)
      setSlideStates(json.urls.map(() => ({ state: 'idle' as const })))
      toast.success(`${json.urls.length} slide(s) gerado(s)`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao gerar'
      toast.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  function onRegerar(index: number) {
    if (!response) return
    setRegerarIndex(index)
  }

  async function confirmRegerar(ajustePrompt: string) {
    if (regerarIndex === null || !response) return
    const targetIndex = regerarIndex
    const targetPlan = response.slidePlans[targetIndex]
    if (!targetPlan) return

    setRegerarSubmitting(true)
    setSlideStates((prev) => {
      const next = [...prev]
      next[targetIndex] = { state: 'loading' }
      return next
    })

    try {
      const payload = {
        slideIndex: targetIndex,
        ajustePrompt,
        slidePlanOriginal: targetPlan,
        packAssets: response.packAssets,
        contextoOriginal: buildT2InputPayload({ tab, contextoGeral, slides, keyword }),
        normalizedKeyword: response.normalizedKeyword,
      }
      const res = await fetch('/api/imagens/m2/t2/regerar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await res.json().catch(() => ({}))) as RegerarResponse
      if (!res.ok || !json.url) {
        throw new Error(json.error || `Falha (${res.status})`)
      }
      // Atualiza só esse slide.
      setResponse((prev) => {
        if (!prev) return prev
        const urls = [...prev.urls]
        const qcReports = [...prev.qcReports]
        urls[targetIndex] = json.url
        qcReports[targetIndex] = json.qcReport
        return {
          ...prev,
          urls,
          qcReports,
          packAssets: json.packAssets ?? prev.packAssets,
        }
      })
      setSlideStates((prev) => {
        const next = [...prev]
        next[targetIndex] = { state: 'idle' }
        return next
      })
      setRegerarIndex(null)
      toast.success(`Slide ${targetIndex + 1} regerado`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao regerar'
      toast.error(msg)
      setSlideStates((prev) => {
        const next = [...prev]
        next[targetIndex] = { state: 'error', errorMsg: msg }
        return next
      })
    } finally {
      setRegerarSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <TabSwitcher value={tab} onChange={setTab} />

        {tab === 'carrossel' && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium">
              Quantidade de slides
              <TooltipInfo text="2 a 8 slides. Slide 1 = capa, último = CTA final, demais = conteúdo (content-3 ou content-6 conforme densidade)." />
            </label>
            <input
              type="number"
              min={MIN_SLIDES}
              max={MAX_SLIDES}
              value={numSlides}
              onChange={(e) =>
                setNumSlides(Math.min(MAX_SLIDES, Math.max(MIN_SLIDES, parseInt(e.target.value) || MIN_SLIDES)))
              }
              disabled={generating}
              className="h-9 w-20 rounded-md border border-[color:var(--border-strong)] bg-white px-2 text-center text-[13.5px] outline-none focus:border-[#553679]"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-xs font-medium">
            Tema / Contexto geral (opcional)
            <TooltipInfo text="Tema do carrossel. Influencia background family e enriquece prompts de IA isolada. Ex.: 'bucha de cozinha', 'capa elástica', 'banheiro'." />
          </label>
          <Textarea
            value={contextoGeral}
            onChange={(e) => setContextoGeral(e.target.value)}
            maxLength={500}
            placeholder="Ex.: bucha de cozinha"
            rows={2}
            disabled={generating}
          />
        </div>

        <div className="flex flex-col gap-3">
          {slides.map((s, i) => {
            const isCover = tab === 'carrossel' && i === 0
            const isCtaFinal =
              tab === 'carrossel' ? i === slides.length - 1 : tab === 'imagem-unica'
            return (
              <T2SlideBlock
                key={i}
                index={i}
                total={slides.length}
                value={s}
                onChange={(next) => {
                  const arr = [...slides]
                  arr[i] = next
                  setSlides(arr)
                }}
                isCover={isCover}
                isCtaFinal={isCtaFinal}
                disabled={generating}
              />
            )
          })}
        </div>

        <KeywordField
          value={keyword}
          onChange={setKeyword}
          fallbackHint={fallbackKeywordHint()}
          disabled={generating}
        />

        <div className="flex items-center justify-end gap-3">
          {!isValid && (
            <div className="text-[11.5px] text-[color:var(--text-tertiary)]">
              Preencha copy de cada slide (min 10 chars).
            </div>
          )}
          <Button
            type="button"
            variant="brand"
            size="lg"
            disabled={!isValid || generating}
            onClick={onSubmit}
            className="min-w-[180px]"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando…
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Gerar Posts
              </>
            )}
          </Button>
        </div>

        {response && response.urls.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
            {response.urls.map((url, idx) => {
              const slidePlan = response.slidePlans[idx]
              const slideId = slidePlan?.slideId ?? `slide-${idx + 1}`
              const qc = response.qcReports[idx]
              const slideState = slideStates[idx] ?? { state: 'idle' as const }
              return (
                <T2PreviewCard
                  key={`${slideId}-${idx}`}
                  slideIndex={idx}
                  slideId={slideId}
                  url={url}
                  filename={downloadFilenameFor(idx)}
                  state={slideState.state}
                  errorMsg={slideState.errorMsg}
                  qcScore={qc?.qualityScore ?? 100}
                  qcWarningsCount={qc?.warnings.length ?? 0}
                  onRegerar={() => onRegerar(idx)}
                />
              )
            })}
          </div>
        )}
      </div>

      <T2RegerarDialog
        open={regerarIndex !== null}
        onOpenChange={(o) =>
          !regerarSubmitting && setRegerarIndex(o ? regerarIndex : null)
        }
        slideId={
          regerarIndex !== null && response
            ? response.slidePlans[regerarIndex]?.slideId
            : null
        }
        onConfirm={(prompt) => void confirmRegerar(prompt)}
        submitting={regerarSubmitting}
      />
    </>
  )
}
