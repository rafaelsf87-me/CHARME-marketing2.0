'use client'

import * as React from 'react'
import { TabTipoMovel } from './tab-tipo-movel'
import { StepSet } from './step-set'
import { StepTipoCapa } from './step-tipo-capa'
import { StepTipoFoto } from './step-tipo-foto'
import { StepUploadReferencia } from './step-upload-referencia'
import { StepCorLisa } from './step-cor-lisa'
import { StepCustomizacao } from './step-customizacao'
import { GenerateButton } from './generate-button'
import { PreviewArea } from './preview-area'
import {
  M1RenderSchema,
  type M1Movel,
  type M1TipoCapa,
  type M1TipoFoto,
  type M1RenderInput,
} from '@/lib/m1/schema'
import type { M1Set } from '@/lib/m1/templates'

type PreviewState = 'empty' | 'loading' | 'ready' | 'error'

export function M1Form() {
  const [movel, setMovel] = React.useState<M1Movel>('sofa')
  const [set, setSet] = React.useState<M1Set | null>(null)
  const [tipoCapa, setTipoCapa] = React.useState<M1TipoCapa | null>(null)
  const [tipoFoto, setTipoFoto] = React.useState<M1TipoFoto | null>(null)
  const [referenciaBlobUrl, setReferenciaBlobUrl] = React.useState<string | null>(null)
  const [corHex, setCorHex] = React.useState<string | null>(null)
  const [customization, setCustomization] = React.useState('')

  const [previewState, setPreviewState] = React.useState<PreviewState>('empty')
  const [resultUrl, setResultUrl] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [tookMs, setTookMs] = React.useState<number | null>(null)

  // Capa Lisa troca upload por cor; alternar zera o outro lado.
  function onChangeTipoCapa(novo: M1TipoCapa) {
    setTipoCapa(novo)
    if (novo === 'lisa') {
      setReferenciaBlobUrl(null)
    } else {
      setCorHex(null)
    }
  }

  const isCapaLisa = tipoCapa === 'lisa'

  const isValid = React.useMemo(() => {
    if (!set || !tipoCapa || !tipoFoto) return false
    if (isCapaLisa) return corHex !== null
    return referenciaBlobUrl !== null
  }, [set, tipoCapa, tipoFoto, referenciaBlobUrl, corHex, isCapaLisa])

  async function onGenerate() {
    if (!isValid || !set || !tipoCapa || !tipoFoto) return

    setPreviewState('loading')
    setErrorMsg(null)
    setResultUrl(null)
    setTookMs(null)

    const payload: M1RenderInput = {
      movel,
      set,
      tipoCapa,
      tipoFoto,
      referenciaBlobUrl: isCapaLisa ? undefined : referenciaBlobUrl ?? undefined,
      corHex: isCapaLisa ? corHex ?? undefined : undefined,
      customization: customization.trim() || undefined,
    }

    const localCheck = M1RenderSchema.safeParse(payload)
    if (!localCheck.success) {
      setPreviewState('error')
      setErrorMsg(localCheck.error.issues[0]?.message ?? 'Dados inválidos')
      return
    }

    try {
      const res = await fetch('/api/imagens/m1/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        setPreviewState('error')
        setErrorMsg(json.error || 'Falha ao gerar foto')
        return
      }
      setResultUrl(json.url)
      setTookMs(typeof json.tookMs === 'number' ? json.tookMs : null)
      setPreviewState('ready')
    } catch (err) {
      setPreviewState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Erro de rede')
    }
  }

  return (
    <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-6">
        {/* 1. Tipo móvel */}
        <TabTipoMovel value={movel} onChange={setMovel} />

        {/* 2. Set */}
        <StepSet movel={movel} value={set} onChange={setSet} />

        {/* 3. Tipo capa */}
        <StepTipoCapa value={tipoCapa} onChange={onChangeTipoCapa} />

        {/* 4. Tipo foto */}
        <StepTipoFoto value={tipoFoto} onChange={setTipoFoto} />

        {/* 5. Upload referência ou color picker */}
        {isCapaLisa ? (
          <StepCorLisa value={corHex} onChange={setCorHex} />
        ) : (
          <StepUploadReferencia value={referenciaBlobUrl} onChange={setReferenciaBlobUrl} />
        )}

        <StepCustomizacao value={customization} onChange={setCustomization} />

        <GenerateButton
          isValid={isValid}
          loading={previewState === 'loading'}
          onClick={onGenerate}
        />
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <PreviewArea
          state={previewState}
          url={resultUrl}
          errorMsg={errorMsg}
          tookMs={tookMs}
        />
      </div>
    </div>
  )
}
