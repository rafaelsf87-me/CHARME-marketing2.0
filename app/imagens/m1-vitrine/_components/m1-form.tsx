'use client'

import * as React from 'react'
import { TabTipoMovel } from './tab-tipo-movel'
import { StepTipoCapa } from './step-tipo-capa'
import { StepTipoFoto } from './step-tipo-foto'
import { StepCenario } from './step-cenario'
import { StepUploadReferencia } from './step-upload-referencia'
import { StepCustomizacao } from './step-customizacao'
import { GenerateButton } from './generate-button'
import { PreviewArea } from './preview-area'
import {
  M1RenderSchema,
  M1_TIPOS_COM_CENARIO,
  type M1Movel,
  type M1TipoCapa,
  type M1TipoFoto,
  type M1RenderInput,
} from '@/lib/m1/schema'

type PreviewState = 'empty' | 'loading' | 'ready' | 'error'

function tipoUsaCenario(tipo: M1TipoFoto | null): boolean {
  return tipo !== null && M1_TIPOS_COM_CENARIO.includes(tipo)
}

export function M1Form() {
  const [movel, setMovel] = React.useState<M1Movel>('sofa')
  const [tipoCapa, setTipoCapa] = React.useState<M1TipoCapa | null>(null)
  const [tipoFoto, setTipoFoto] = React.useState<M1TipoFoto | null>(null)
  const [cenarioId, setCenarioId] = React.useState<string | null>(null)
  const [referenciaBlobUrl, setReferenciaBlobUrl] = React.useState<string | null>(null)
  const [customization, setCustomization] = React.useState('')

  const [previewState, setPreviewState] = React.useState<PreviewState>('empty')
  const [resultUrl, setResultUrl] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [tookMs, setTookMs] = React.useState<number | null>(null)

  // Trocar móvel zera cenário (cenários são por móvel).
  function onChangeMovel(novo: M1Movel) {
    setMovel(novo)
    setCenarioId(null)
  }

  // Trocar tipo de foto: zera cenário se mudou entre A↔B,
  // e zera upload (significado muda).
  function onChangeTipoFoto(novo: M1TipoFoto) {
    const antesUsavaCenario = tipoUsaCenario(tipoFoto)
    const depoisUsaCenario = tipoUsaCenario(novo)
    if (antesUsavaCenario !== depoisUsaCenario) {
      setReferenciaBlobUrl(null)
    }
    if (!depoisUsaCenario) {
      setCenarioId(null)
    }
    setTipoFoto(novo)
  }

  const mostraCenario = tipoUsaCenario(tipoFoto)

  const isValid = React.useMemo(() => {
    if (!tipoCapa || !tipoFoto || !referenciaBlobUrl) return false
    if (mostraCenario && !cenarioId) return false
    return true
  }, [tipoCapa, tipoFoto, cenarioId, referenciaBlobUrl, mostraCenario])

  async function onGenerate() {
    if (!isValid || !tipoCapa || !tipoFoto || !referenciaBlobUrl) return

    setPreviewState('loading')
    setErrorMsg(null)
    setResultUrl(null)
    setTookMs(null)

    const payload: M1RenderInput = {
      movel,
      tipoCapa,
      tipoFoto,
      cenarioId: mostraCenario ? cenarioId ?? undefined : undefined,
      referenciaBlobUrl,
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
        <TabTipoMovel value={movel} onChange={onChangeMovel} />

        <StepTipoCapa value={tipoCapa} onChange={setTipoCapa} />

        <StepTipoFoto value={tipoFoto} onChange={onChangeTipoFoto} />

        {mostraCenario && tipoFoto && (
          <StepCenario
            movel={movel}
            tipoFoto={tipoFoto as 'capa' | 'ambiente'}
            value={cenarioId}
            onChange={setCenarioId}
          />
        )}

        <StepUploadReferencia
          tipoFoto={tipoFoto}
          value={referenciaBlobUrl}
          onChange={setReferenciaBlobUrl}
        />

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
