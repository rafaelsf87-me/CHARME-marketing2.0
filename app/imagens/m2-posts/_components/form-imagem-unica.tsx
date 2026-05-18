'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TooltipInfo } from '@/components/tooltip-info'
import { LogoSelector } from './logo-selector'
import { ModoGeracaoSelector } from './modo-geracao-selector'
import { PngUploadList } from './png-upload-list'
import { PreviewImagemUnica } from './preview-imagem-unica'
import { KeywordField } from '@/components/shared/keyword-field'
import type { M2LogoOption, M2ModoGeracao, M2TemplateId } from '@/lib/m2/schema'

interface FormImagemUnicaProps {
  templateId: M2TemplateId
}

type PreviewState =
  | { state: 'empty' }
  | { state: 'loading' }
  | { state: 'ready'; url: string; normalizedKeyword: string | null; generatedAt: string | null }
  | { state: 'error'; errorMsg: string }

const COPY_MIN = 10
const COPY_MAX = 2000
const INSTRUCOES_MAX = 500
const USO_IMAGENS_MAX = 800

export function FormImagemUnica({ templateId }: FormImagemUnicaProps) {
  const [logo, setLogo] = React.useState<M2LogoOption>('casinha')
  const [modoGeracao, setModoGeracao] = React.useState<M2ModoGeracao>('ia')
  const [copyTexto, setCopyTexto] = React.useState('')
  const [instrucoesExtras, setInstrucoesExtras] = React.useState('')
  const [instrucoesUsoImagens, setInstrucoesUsoImagens] = React.useState('')
  const [pngSlots, setPngSlots] = React.useState<(string | null)[]>([])
  const [keyword, setKeyword] = React.useState('')
  const [preview, setPreview] = React.useState<PreviewState>({ state: 'empty' })

  const generating = preview.state === 'loading'
  const isUpload = modoGeracao === 'upload'
  const copyLen = copyTexto.length
  const pngsCount = pngSlots.filter(Boolean).length
  const uploadValido = !isUpload || pngsCount > 0
  const isValid = copyLen >= COPY_MIN && copyLen <= COPY_MAX && uploadValido

  async function onGenerate() {
    if (!isValid || generating) return
    const pngUrls = pngSlots.filter((u): u is string => !!u)
    setPreview({ state: 'loading' })
    try {
      const res = await fetch('/api/imagens/m2/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          modo: 'imagem-unica',
          templateId,
          logo,
          modoGeracao,
          copyTexto: copyTexto.trim(),
          instrucoesExtras: instrucoesExtras.trim() || undefined,
          pngUrls: pngUrls.length > 0 ? pngUrls : undefined,
          instrucoesUsoImagens: isUpload && instrucoesUsoImagens.trim()
            ? instrucoesUsoImagens.trim()
            : undefined,
          keyword: keyword.trim() || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !Array.isArray(json.urls) || !json.urls[0]) {
        throw new Error(json.error || `Falha (${res.status})`)
      }
      setPreview({
        state: 'ready',
        url: json.urls[0],
        normalizedKeyword: typeof json.normalizedKeyword === 'string' ? json.normalizedKeyword : null,
        generatedAt: typeof json.generatedAt === 'string' ? json.generatedAt : null,
      })
    } catch (err) {
      setPreview({
        state: 'error',
        errorMsg: err instanceof Error ? err.message : 'Falha ao gerar',
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Linha 1: Logo (em T2/T3) — Modo de geração foi movido pra depois das instruções */}
      {templateId !== 'atual-maio26' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LogoSelector value={logo} onChange={setLogo} disabled={generating} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-medium">
            Copy do post
            <TooltipInfo text="Texto exato que a IA deve usar no post. Português, com acentos. Mín. 10 / máx. 2000 caracteres." />
          </label>
          <span
            className={`tabular-nums text-[11px] ${
              copyLen > COPY_MAX
                ? 'text-[#A32D2D]'
                : 'text-[color:var(--text-tertiary)]'
            }`}
          >
            {copyLen}/{COPY_MAX}
          </span>
        </div>
        <Textarea
          value={copyTexto}
          onChange={(e) => setCopyTexto(e.target.value)}
          maxLength={COPY_MAX}
          placeholder="Ex.: 3 motivos para escolher capa elástica da Charme: 1) Veste o sofá inteiro em 5 minutos..."
          rows={6}
          disabled={generating}
        />
      </div>

      {/* Modo IA: instruções extras → Modo de geração → PNGs opcionais (0-3) */}
      {!isUpload && (
        <>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-medium">
                Instruções adicionais (opcional)
                <TooltipInfo text="Ajustes de clima ou composição. Ex.: 'tom mais sério', 'incluir cenário de sala de jantar'. Máx. 500 caracteres." />
              </label>
              <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
                {instrucoesExtras.length}/{INSTRUCOES_MAX}
              </span>
            </div>
            <Textarea
              value={instrucoesExtras}
              onChange={(e) => setInstrucoesExtras(e.target.value)}
              maxLength={INSTRUCOES_MAX}
              placeholder="Ex.: tom acolhedor, paleta com mais verde."
              rows={3}
              disabled={generating}
            />
          </div>

          <ModoGeracaoSelector value={modoGeracao} onChange={setModoGeracao} disabled={generating} />

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-xs font-medium">
              PNGs de referência (opcional · até 3)
              <TooltipInfo text="Opcional. PNGs que o modelo usa como referência visual leve. Pra controle preciso, use modo Upload." />
            </label>
            <PngUploadList
              value={pngSlots}
              onChange={setPngSlots}
              maxSlots={3}
              disabled={generating}
            />
          </div>
        </>
      )}

      {/* Modo Upload: Modo de geração → 1-8 PNGs obrigatórios → instruções de uso */}
      {isUpload && (
        <>
          <ModoGeracaoSelector value={modoGeracao} onChange={setModoGeracao} disabled={generating} />

          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-xs font-medium">
              Upload de imagens (1-8 · obrigatório)
              <TooltipInfo text="Modo upload: pelo menos 1 PNG. Até 8. Referencie cada imagem pelo nome do arquivo no campo abaixo." />
            </label>
            <PngUploadList
              value={pngSlots}
              onChange={setPngSlots}
              maxSlots={8}
              firstRequired
              disabled={generating}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-medium">
                Instruções de uso das imagens
                <TooltipInfo text="Como referenciar: nome do arquivo + função. Ex.: 'Use foto-sofa.png como elemento central, escala 60%' / 'Mantenha icone-arrow.png cyan, sem alterar a cor'. O modelo segue literalmente — seja específico." />
              </label>
              <span className="tabular-nums text-[11px] text-[color:var(--text-tertiary)]">
                {instrucoesUsoImagens.length}/{USO_IMAGENS_MAX}
              </span>
            </div>
            <Textarea
              value={instrucoesUsoImagens}
              onChange={(e) => setInstrucoesUsoImagens(e.target.value)}
              maxLength={USO_IMAGENS_MAX}
              placeholder="Ex.: Use foto-sofa.png como elemento central, escala 60%. Coloque icone-arrow.png à direita do título."
              rows={4}
              disabled={generating}
            />
          </div>
        </>
      )}

      <KeywordField
        value={keyword}
        onChange={setKeyword}
        fallbackHint={copyTexto.trim().split(/\s+/)[0] || 'ex.: bucha, floral'}
        disabled={generating}
      />

      <div>
        <Button
          type="button"
          variant="brand"
          size="lg"
          disabled={!isValid || generating}
          onClick={onGenerate}
        >
          {generating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Gerando imagem...
            </>
          ) : (
            'Gerar imagem'
          )}
        </Button>
      </div>

      {/* Preview só aparece após gerar (hotfix v6) */}
      {preview.state !== 'empty' && (
        <PreviewImagemUnica
          state={preview.state}
          url={preview.state === 'ready' ? preview.url : undefined}
          errorMsg={preview.state === 'error' ? preview.errorMsg : undefined}
          normalizedKeyword={preview.state === 'ready' ? preview.normalizedKeyword : null}
          generatedAt={preview.state === 'ready' ? preview.generatedAt : null}
        />
      )}
    </div>
  )
}
