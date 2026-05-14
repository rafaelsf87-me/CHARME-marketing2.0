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
import { CostConfirmDialog } from './cost-confirm-dialog'
import { ResultsGrid, type ResultSlot } from './results-grid'
import type { M1Movel, M1TipoCapa, M1TipoFoto, M1RenderInput } from '@/lib/m1/schema'
import type { M1Set } from '@/lib/m1/templates'

// Custo por render do Pipeline A (fal.ai Flux Kontext Pro).
const CUSTO_POR_FOTO_USD = 0.1
// A partir desse total, mostra modal de confirmação.
const LIMIAR_CUSTO_USD = 0.3
// Worker pool: 2 renders em paralelo, fila pra >2 fotos.
const POOL_SIZE = 2

export function M1Form() {
  const [movel, setMovel] = React.useState<M1Movel>('sofa')
  const [set, setSet] = React.useState<M1Set | null>(null)
  const [tipoCapa, setTipoCapa] = React.useState<M1TipoCapa | null>(null)
  const [tiposFoto, setTiposFoto] = React.useState<M1TipoFoto[]>([])
  const [referenciaBlobUrl, setReferenciaBlobUrl] = React.useState<string | null>(null)
  const [corHex, setCorHex] = React.useState<string | null>(null)
  const [customization, setCustomization] = React.useState('')

  const [slots, setSlots] = React.useState<ResultSlot[]>([])
  const [generating, setGenerating] = React.useState(false)
  const [costDialogOpen, setCostDialogOpen] = React.useState(false)

  function onChangeTipoCapa(novo: M1TipoCapa) {
    setTipoCapa(novo)
    if (novo === 'lisa') setReferenciaBlobUrl(null)
    else setCorHex(null)
  }

  const isCapaLisa = tipoCapa === 'lisa'

  const isValid = React.useMemo(() => {
    if (!set || !tipoCapa || tiposFoto.length === 0) return false
    if (isCapaLisa) return corHex !== null
    return referenciaBlobUrl !== null
  }, [set, tipoCapa, tiposFoto, referenciaBlobUrl, corHex, isCapaLisa])

  const custoTotalUsd = tiposFoto.length * CUSTO_POR_FOTO_USD

  function buildPayload(tipo: M1TipoFoto): M1RenderInput {
    return {
      movel,
      set: set!,
      tipoCapa: tipoCapa!,
      tipoFoto: tipo,
      referenciaBlobUrl: isCapaLisa ? undefined : referenciaBlobUrl ?? undefined,
      corHex: isCapaLisa ? corHex ?? undefined : undefined,
      customization: customization.trim() || undefined,
    }
  }

  async function renderOne(tipo: M1TipoFoto): Promise<{ url: string; tookMs: number }> {
    const payload = buildPayload(tipo)
    const startedAt = Date.now()
    const res = await fetch('/api/imagens/m1/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.url) {
      throw new Error(json.error || `Falha (${res.status})`)
    }
    const tookMs = typeof json.tookMs === 'number' ? json.tookMs : Date.now() - startedAt
    return { url: json.url, tookMs }
  }

  function updateSlot(index: number, status: ResultSlot['status']) {
    setSlots((prev) => {
      const next = [...prev]
      if (next[index]) next[index] = { ...next[index], status }
      return next
    })
  }

  async function runWithPool(indices: number[], tipos: M1TipoFoto[]) {
    let cursor = 0
    async function worker() {
      while (cursor < indices.length) {
        const i = cursor++
        const slotIdx = indices[i]
        const tipo = tipos[i]
        updateSlot(slotIdx, { state: 'loading' })
        try {
          const { url, tookMs } = await renderOne(tipo)
          updateSlot(slotIdx, { state: 'ready', url, tookMs })
        } catch (err) {
          updateSlot(slotIdx, {
            state: 'error',
            message: err instanceof Error ? err.message : 'Falha ao gerar',
          })
        }
      }
    }
    const workers = Array.from({ length: Math.min(POOL_SIZE, indices.length) }, worker)
    await Promise.all(workers)
  }

  async function startGeneration() {
    if (!isValid) return
    setGenerating(true)
    const initialSlots: ResultSlot[] = tiposFoto.map((t) => ({
      tipoFoto: t,
      status: { state: 'loading' },
    }))
    setSlots(initialSlots)
    try {
      await runWithPool(
        tiposFoto.map((_, i) => i),
        tiposFoto
      )
    } finally {
      setGenerating(false)
    }
  }

  function onGenerate() {
    if (!isValid) return
    if (custoTotalUsd >= LIMIAR_CUSTO_USD) {
      setCostDialogOpen(true)
      return
    }
    void startGeneration()
  }

  async function onRetry(index: number) {
    const slot = slots[index]
    if (!slot) return
    setGenerating(true)
    try {
      await runWithPool([index], [slot.tipoFoto])
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <TabTipoMovel value={movel} onChange={setMovel} />
        <StepSet movel={movel} value={set} onChange={setSet} />
        <StepTipoCapa value={tipoCapa} onChange={onChangeTipoCapa} />
        <StepTipoFoto value={tiposFoto} onChange={setTiposFoto} />

        {isCapaLisa ? (
          <StepCorLisa value={corHex} onChange={setCorHex} />
        ) : (
          <StepUploadReferencia value={referenciaBlobUrl} onChange={setReferenciaBlobUrl} />
        )}

        <StepCustomizacao value={customization} onChange={setCustomization} />

        <GenerateButton
          isValid={isValid}
          loading={generating}
          qtdFotos={tiposFoto.length}
          onClick={onGenerate}
        />

        <ResultsGrid slots={slots} onRetry={onRetry} />
      </div>

      <CostConfirmDialog
        open={costDialogOpen}
        onOpenChange={setCostDialogOpen}
        qtdFotos={tiposFoto.length}
        custoTotalUsd={custoTotalUsd}
        onConfirm={() => void startGeneration()}
      />
    </>
  )
}
