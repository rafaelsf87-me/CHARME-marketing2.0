'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { TabTipoMovel } from './tab-tipo-movel'
import { StepSet } from './step-set'
import { StepTipoCapa } from './step-tipo-capa'
import { StepTipoFoto } from './step-tipo-foto'
import { StepUploadsPattern } from './step-uploads-pattern'
import { StepCorLisa } from './step-cor-lisa'
import { StepCustomizacao } from './step-customizacao'
import { GenerateButton } from './generate-button'
import { CostConfirmDialog } from './cost-confirm-dialog'
import { NoRoloWarningDialog } from './no-rolo-warning-dialog'
import { RegerarDialog } from './regerar-dialog'
import { ResultsGrid, type ResultSlot } from './results-grid'
import type { M1Movel, M1TipoCapa, M1TipoFoto, M1RenderInput } from '@/lib/m1/schema'
import type { M1Set } from '@/lib/m1/templates'

// Custo por render do Pipeline A (nano-banana-2 @ 2K, single-step).
const CUSTO_POR_FOTO_USD = 0.12
// A partir desse total, mostra modal de confirmação.
const LIMIAR_CUSTO_USD = 0.3
// Worker pool: 2 renders em paralelo, fila pra >2 fotos.
const POOL_SIZE = 2

export function M1Form() {
  const [movel, setMovel] = React.useState<M1Movel>('sofa')
  const [set, setSet] = React.useState<M1Set | null>(null)
  const [tipoCapa, setTipoCapa] = React.useState<M1TipoCapa | null>(null)
  const [tiposFoto, setTiposFoto] = React.useState<M1TipoFoto[]>([])
  const [fotoSofa, setFotoSofa] = React.useState<string | null>(null)
  const [fotoRolo, setFotoRolo] = React.useState<string | null>(null)
  const [corHex, setCorHex] = React.useState<string | null>(null)
  const [customization, setCustomization] = React.useState('')

  const [slots, setSlots] = React.useState<ResultSlot[]>([])
  const [generating, setGenerating] = React.useState(false)
  const [costDialogOpen, setCostDialogOpen] = React.useState(false)
  const [noRoloDialogOpen, setNoRoloDialogOpen] = React.useState(false)

  // Regeração individual: dialog aberto pra um slot específico + submitting.
  const [regerarIndex, setRegerarIndex] = React.useState<number | null>(null)
  const [regerarSubmitting, setRegerarSubmitting] = React.useState(false)

  function onChangeTipoCapa(novo: M1TipoCapa) {
    setTipoCapa(novo)
    if (novo === 'lisa') {
      setFotoSofa(null)
      setFotoRolo(null)
    } else {
      setCorHex(null)
    }
  }

  const isCapaLisa = tipoCapa === 'lisa'

  const isValid = React.useMemo(() => {
    if (!set || !tipoCapa || tiposFoto.length === 0) return false
    if (isCapaLisa) return corHex !== null
    return fotoSofa !== null
  }, [set, tipoCapa, tiposFoto, fotoSofa, corHex, isCapaLisa])

  const custoTotalUsd = tiposFoto.length * CUSTO_POR_FOTO_USD

  function buildPayload(tipo: M1TipoFoto): M1RenderInput {
    return {
      movel,
      set: set!,
      tipoCapa: tipoCapa!,
      tipoFoto: tipo,
      fotoSofa: isCapaLisa ? undefined : fotoSofa ?? undefined,
      fotoRolo: isCapaLisa ? undefined : fotoRolo ?? undefined,
      corHex: isCapaLisa ? corHex ?? undefined : undefined,
      customization: customization.trim() || undefined,
    }
  }

  async function renderOne(tipo: M1TipoFoto): Promise<{
    url: string
    tookMs: number
    payload: M1RenderInput
    normalizedKeyword: string | null
    generatedAt: string | null
  }> {
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
    return {
      url: json.url,
      tookMs,
      payload,
      normalizedKeyword: typeof json.normalizedKeyword === 'string' ? json.normalizedKeyword : null,
      generatedAt: typeof json.generatedAt === 'string' ? json.generatedAt : null,
    }
  }

  function updateSlot(index: number, patch: Partial<ResultSlot>) {
    setSlots((prev) => {
      const next = [...prev]
      if (next[index]) next[index] = { ...next[index], ...patch }
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
        updateSlot(slotIdx, { status: { state: 'loading' } })
        try {
          const { url, tookMs, payload, normalizedKeyword, generatedAt } = await renderOne(tipo)
          updateSlot(slotIdx, {
            status: { state: 'ready', url, tookMs, normalizedKeyword, generatedAt },
            contextoOriginal: payload,
          })
        } catch (err) {
          updateSlot(slotIdx, {
            status: {
              state: 'error',
              message: err instanceof Error ? err.message : 'Falha ao gerar',
            },
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

  // Pulou direto pro fluxo de custo: usuário aceitou aviso ou não há fotoRolo a alertar.
  function proceedAfterRoloCheck() {
    if (custoTotalUsd >= LIMIAR_CUSTO_USD) {
      setCostDialogOpen(true)
      return
    }
    void startGeneration()
  }

  function onGenerate() {
    if (!isValid) return
    // Estampada/Alto Relevo sem fotoRolo → alerta antes do custo.
    if (!isCapaLisa && !fotoRolo) {
      setNoRoloDialogOpen(true)
      return
    }
    proceedAfterRoloCheck()
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

  function onRegerar(index: number) {
    const slot = slots[index]
    if (!slot || !slot.contextoOriginal) return
    setRegerarIndex(index)
  }

  async function confirmRegerar(ajustePrompt: string) {
    if (regerarIndex === null) return
    const slot = slots[regerarIndex]
    if (!slot || !slot.contextoOriginal) return

    const contextoOriginal = slot.contextoOriginal
    const targetIndex = regerarIndex

    setRegerarSubmitting(true)
    // Card vai pra loading isolado; outros permanecem.
    updateSlot(targetIndex, { status: { state: 'loading' } })

    try {
      const startedAt = Date.now()
      const res = await fetch('/api/imagens/m1/regerar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contextoOriginal, ajustePrompt }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) {
        throw new Error(json.error || `Falha (${res.status})`)
      }
      const tookMs = typeof json.tookMs === 'number' ? json.tookMs : Date.now() - startedAt
      updateSlot(targetIndex, {
        status: {
          state: 'ready',
          url: json.url,
          tookMs,
          normalizedKeyword: typeof json.normalizedKeyword === 'string' ? json.normalizedKeyword : null,
          generatedAt: typeof json.generatedAt === 'string' ? json.generatedAt : null,
        },
      })
      setRegerarIndex(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao regerar'
      toast.error(message)
      // Volta ao estado original: tentar lembrar que era ready — o contexto continua válido.
      // Marcamos como erro contextualizado pra o usuário.
      updateSlot(targetIndex, {
        status: { state: 'error', message },
      })
    } finally {
      setRegerarSubmitting(false)
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
          <StepUploadsPattern
            fotoSofa={fotoSofa}
            fotoRolo={fotoRolo}
            onChangeSofa={setFotoSofa}
            onChangeRolo={setFotoRolo}
          />
        )}

        <StepCustomizacao value={customization} onChange={setCustomization} />

        <GenerateButton
          isValid={isValid}
          loading={generating}
          qtdFotos={tiposFoto.length}
          onClick={onGenerate}
        />

        <ResultsGrid slots={slots} onRetry={onRetry} onRegerar={onRegerar} />
      </div>

      <CostConfirmDialog
        open={costDialogOpen}
        onOpenChange={setCostDialogOpen}
        qtdFotos={tiposFoto.length}
        custoTotalUsd={custoTotalUsd}
        onConfirm={() => void startGeneration()}
      />

      <NoRoloWarningDialog
        open={noRoloDialogOpen}
        onOpenChange={setNoRoloDialogOpen}
        onConfirm={proceedAfterRoloCheck}
      />

      <RegerarDialog
        open={regerarIndex !== null}
        onOpenChange={(o) => !regerarSubmitting && setRegerarIndex(o ? regerarIndex : null)}
        onConfirm={(prompt) => void confirmRegerar(prompt)}
        submitting={regerarSubmitting}
      />
    </>
  )
}
