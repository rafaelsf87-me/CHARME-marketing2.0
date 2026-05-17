'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Button } from '@/components/ui/button'
import { M3InputSchema, type M3Input, type M3Output } from '@/lib/m3/schema'
import { brandM3 } from '@/lib/brand/m3.brand'
import { TemplateSelector } from './_components/template-selector'
import { FormTextos } from './_components/form-textos'
import { FormCores } from './_components/form-cores'
import { FormCondicoes } from './_components/form-condicoes'
import { FormAtriz } from './_components/form-atriz'
import { FormDecoracoes } from './_components/form-decoracoes'
import { LoadingProgress } from './_components/loading-progress'
import { PreviewBanners } from './_components/preview-banners'

type RenderState =
  | { kind: 'idle' }
  | { kind: 'generating'; atrizMode: 'ia' | 'upload'; startedAt: number }
  | { kind: 'success'; output: M3Output }
  | { kind: 'error'; message: string }

const DEFAULT_VALUES: M3Input = {
  template: 'atual-maio26',
  textos: {
    nomePromocao: '',
    descontoTexto: '',
    naLojaToda: true,
  },
  cores: {
    primary: brandM3.defaultColors.primary,
    secondary: brandM3.defaultColors.secondary,
    accent: brandM3.defaultColors.accent,
    cardBg: brandM3.defaultColors.cardBg,
    cardBgEnd: brandM3.defaultColors.cardBgEnd,
  },
  condicoes: ['12x-cartao', 'frete-gratis', 'cashback', 'entrega-rapida'],
  atriz: { modo: 'ia' },
  decoracoes: {
    modo: 'banco',
    ids: ['coracao-rosa', 'coracao-batendo', 'coracao-decoracao', 'coracao-vermelho'],
  },
}

export default function M3Page() {
  const form = useForm<M3Input>({
    resolver: zodResolver(M3InputSchema),
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  })
  const [state, setState] = React.useState<RenderState>({ kind: 'idle' })

  const isGenerating = state.kind === 'generating'

  async function onSubmit(input: M3Input) {
    setState({ kind: 'generating', atrizMode: input.atriz.modo, startedAt: Date.now() })
    try {
      const res = await fetch('/api/imagens/m3/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || `Falha ao gerar (HTTP ${res.status})`)
      }
      setState({ kind: 'success', output: json as M3Output })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao gerar banner'
      setState({ kind: 'error', message })
      toast.error(message)
    }
  }

  function onReset() {
    setState({ kind: 'idle' })
  }

  return (
    <div className="px-10 py-9">
      <Breadcrumb items={[{ label: 'Geração de Imagens' }, { label: 'M3 · Banners' }]} />
      <h1 className="m-0 text-[26px] font-medium tracking-[-0.025em]">Banners Website</h1>
      <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
        Par desktop (1920×550) + mobile (800×600) gerado via Pipeline Híbrido.
        Título 3D balão pela IA, atriz isolada, layout pixel-preciso.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        <TemplateSelector
          value={form.watch('template')}
          onChange={(v) => form.setValue('template', v)}
          disabled={isGenerating}
        />

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <FormTextos form={form} disabled={isGenerating} />
            <FormCores form={form} disabled={isGenerating} />
          </div>

          <FormCondicoes form={form} disabled={isGenerating} />
          <FormAtriz form={form} disabled={isGenerating} />
          <FormDecoracoes form={form} disabled={isGenerating} />

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="brand"
              size="lg"
              disabled={!form.formState.isValid || isGenerating}
              className="min-w-[200px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando…
                </>
              ) : (
                'Gerar Banner'
              )}
            </Button>
            {!form.formState.isValid && form.formState.isSubmitted && (
              <span className="text-xs text-[#A32D2D]">
                Preencha os campos obrigatórios pra continuar.
              </span>
            )}
          </div>
        </form>

        {state.kind === 'generating' && (
          <LoadingProgress atrizMode={state.atrizMode} startedAt={state.startedAt} />
        )}

        {state.kind === 'success' && (
          <PreviewBanners output={state.output} onReset={onReset} />
        )}
      </div>
    </div>
  )
}
