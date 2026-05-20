'use client'

import * as React from 'react'
import { Loader2, Sparkles, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TooltipInfo } from '@/components/tooltip-info'
import { UploadField } from '@/components/upload-field'
import type {
  V2Input,
  V2Plan,
  V2TemplateType,
  V2VariantOverride,
  V2ModoGeracao,
} from '@/lib/m2/v2/types'

interface RenderV2Response {
  url: string
  plan: V2Plan
  qc: { pass: boolean; issues: Array<{ code: string; severity: string; message: string }> }
  via: 'llm' | 'fallback'
  tookMs: number
  costUsd: number
  error?: string
}

export function V2Form() {
  const [templateType, setTemplateType] = React.useState<V2TemplateType>('capa')
  const [brief, setBrief] = React.useState('')
  const [variantOverride, setVariantOverride] = React.useState<V2VariantOverride>('auto')
  const [modoGeracao, setModoGeracao] = React.useState<V2ModoGeracao>('ia')
  const [imageUploadUrl, setImageUploadUrl] = React.useState<string | null>(null)
  const [imagePrompt, setImagePrompt] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [result, setResult] = React.useState<RenderV2Response | null>(null)

  async function handleSubmit() {
    if (brief.trim().length < 10) {
      toast.error('Briefing precisa ter pelo menos 10 caracteres')
      return
    }
    if (modoGeracao === 'upload' && !imageUploadUrl) {
      toast.error('Modo upload exige imagem anexada')
      return
    }

    const payload: V2Input = {
      templateType,
      brief: brief.trim(),
      variantOverride,
      modoGeracao,
      imageUploadUrl: imageUploadUrl ?? undefined,
      imagePrompt: imagePrompt.trim() || undefined,
      logo: 'casinha',
    }

    setIsLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/imagens/m2/v2/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as RenderV2Response
      if (!res.ok || data.error) {
        toast.error(data.error || 'Falha ao gerar')
        return
      }
      setResult(data)
      toast.success(`Gerado em ${(data.tookMs / 1000).toFixed(1)}s · $${data.costUsd.toFixed(4)}`)
    } catch (err) {
      toast.error(`Erro: ${(err as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDownload() {
    if (!result?.url) return
    const a = document.createElement('a')
    a.href = result.url
    a.download = `${result.plan.templateType}-${result.plan.variant}.png`
    a.target = '_blank'
    a.click()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Template Type */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          Template <TooltipInfo text="Capa = primeira slide. CTA-Final = slide final com botão de compartilhamento + footer." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(['capa', 'cta-final'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTemplateType(t)}
              className={`rounded-lg border bg-white p-3 text-left text-sm transition ${
                templateType === t
                  ? 'border-[#553679] ring-2 ring-[#553679]/15'
                  : 'border-[color:var(--border-default)] hover:border-[color:var(--border-strong)]'
              }`}
            >
              <div className="font-medium">{t === 'capa' ? 'Capa' : 'CTA Final'}</div>
              <div className="text-[11.5px] text-[color:var(--text-secondary)]">
                {t === 'capa'
                  ? 'Auto-decide CAPA-CURTA ou CAPA-LONGA por char count'
                  : 'Botão CTA + footer @charmedodetalhe'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Override variant (só pra capa) */}
      {templateType === 'capa' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            Variante <TooltipInfo text="Auto deixa o sistema escolher (≤120 chars = curta, >120 = longa). Use forçar pra override." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['auto', 'Auto (LLM decide)'],
                ['forcar-curta', 'Forçar Curta'],
                ['forcar-longa', 'Forçar Longa'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setVariantOverride(val)}
                className={`rounded-lg border bg-white p-2 text-center text-xs transition ${
                  variantOverride === val
                    ? 'border-[#553679] ring-2 ring-[#553679]/15'
                    : 'border-[color:var(--border-default)] hover:border-[color:var(--border-strong)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modo geração */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          Modo do hero <TooltipInfo text="IA gera o hero via gpt-image-1. Upload usa seu PNG/JPG direto (DEC-M2-014: bypass LLM+IA)." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(['ia', 'upload'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModoGeracao(m)}
              className={`rounded-lg border bg-white p-2 text-center text-xs transition ${
                modoGeracao === m
                  ? 'border-[#553679] ring-2 ring-[#553679]/15'
                  : 'border-[color:var(--border-default)] hover:border-[color:var(--border-strong)]'
              }`}
            >
              {m === 'ia' ? 'IA (gpt-image-1)' : 'Upload PNG/JPG'}
            </button>
          ))}
        </div>
      </div>

      {/* Upload field (só se modo=upload) */}
      {modoGeracao === 'upload' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            Imagem do hero <TooltipInfo text="PNG/JPG até 10MB. Sharp redimensiona pra 1080×1350 (cover)." />
          </div>
          <UploadField
            label="Hero"
            hint="PNG/JPG · até 10MB"
            value={imageUploadUrl}
            onChange={setImageUploadUrl}
          />
        </div>
      )}

      {/* Brief */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-medium">
          Briefing
          <TooltipInfo text="Texto livre. LLM extrai título, bullets e card final (REGRA #0: preserva texto literal, não inventa)." />
        </div>
        <Textarea
          placeholder="Ex: Como renovar a sala gastando pouco&#10;• PROTEGE contra sujeira, manchas e desgastes&#10;• TRANSFORMA o visual da sua sala&#10;• CABE NO BOLSO pequeno investimento&#10;• PRÁTICA E FUNCIONAL fácil de colocar&#10;Destaque: Capa de sofá... muda tudo"
          rows={10}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          disabled={isLoading}
        />
      </div>

      {/* Image prompt override (só modo IA) */}
      {modoGeracao === 'ia' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            Prompt visual (opcional)
            <TooltipInfo text="Override do prompt do hero IA em inglês. Se vazio, planner infere pelo brief." />
          </div>
          <Textarea
            placeholder="Ex: modern gray sofa with stretchable cover, soft natural lighting"
            rows={2}
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={isLoading} className="self-start">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" /> Gerando...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 size-4" /> Gerar imagem
          </>
        )}
      </Button>

      {/* Resultado */}
      {result && (
        <div className="flex flex-col gap-4 rounded-lg border border-[color:var(--border-default)] bg-white p-4">
          <div className="flex items-start gap-4">
            <img
              src={result.url}
              alt="Gerado"
              className="h-[400px] w-auto rounded border"
            />
            <div className="flex flex-1 flex-col gap-2 text-xs">
              <div className="font-semibold">
                {result.plan.templateType} · {result.plan.variant} ({result.plan.variantReason})
              </div>
              <div>Tempo: {(result.tookMs / 1000).toFixed(1)}s · Custo: ${result.costUsd.toFixed(4)} · via {result.via}</div>
              <div>Char count: título {result.plan.charCount.titulo} + bullets {result.plan.charCount.bulletsTotal} = {result.plan.charCount.total}</div>
              {result.plan.bullets.length > 0 && (
                <div>
                  Bullets: {result.plan.bullets.map((b) => `${b.icone}:${b.texto.slice(0, 30)}`).join(' | ')}
                </div>
              )}
              {!result.qc.pass && (
                <div className="text-red-600">
                  QC fail: {result.qc.issues.map((i) => i.code).join(', ')}
                </div>
              )}
              <Button onClick={handleDownload} variant="outline" size="sm" className="self-start">
                <Download className="mr-2 size-4" /> Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
