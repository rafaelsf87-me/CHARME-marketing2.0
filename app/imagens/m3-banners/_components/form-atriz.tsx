'use client'

import * as React from 'react'
import Image from 'next/image'
import type { UseFormReturn } from 'react-hook-form'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { TooltipInfo } from '@/components/tooltip-info'
import type { M3Input } from '@/lib/m3/schema'

interface FormAtrizProps {
  form: UseFormReturn<M3Input>
  disabled?: boolean
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        const base64 = result.split(',')[1] ?? ''
        resolve(base64)
      } else {
        reject(new Error('Falha ao ler arquivo'))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('Erro de leitura'))
    reader.readAsDataURL(file)
  })
}

export function FormAtriz({ form, disabled }: FormAtrizProps) {
  const atriz = form.watch('atriz')
  const [uploadPreview, setUploadPreview] = React.useState<string | null>(null)
  const [uploadName, setUploadName] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function setModo(modo: 'ia' | 'upload') {
    if (modo === 'ia') {
      form.setValue('atriz', { modo: 'ia' }, { shouldValidate: true })
      setUploadPreview(null)
      setUploadName(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } else {
      // Upload precisa de uploadBase64 — placeholder vazio até o user enviar
      form.setValue('atriz', { modo: 'upload', uploadBase64: '' }, { shouldValidate: true })
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`Arquivo grande demais (máx ${MAX_UPLOAD_BYTES / 1024 / 1024}MB)`)
      e.target.value = ''
      return
    }
    try {
      const base64 = await fileToBase64(file)
      form.setValue('atriz', { modo: 'upload', uploadBase64: base64 }, { shouldValidate: true })
      setUploadName(file.name)
      const dataUri = `data:${file.type};base64,${base64}`
      setUploadPreview(dataUri)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao processar arquivo')
    }
  }

  function clearUpload() {
    form.setValue('atriz', { modo: 'upload', uploadBase64: '' }, { shouldValidate: true })
    setUploadPreview(null)
    setUploadName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-[color:var(--border-default)] bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-medium text-[color:var(--text-primary)]">
        Atriz
        <TooltipInfo text="IA gera atriz a partir de prompt OU usa Upload de PNG sua." />
      </h2>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[color:var(--text-tertiary)]">
          {atriz.modo === 'ia'
            ? 'Flux gera atriz a partir do prompt base. ~$0.07/banner.'
            : 'Envie um PNG/JPG seu. Fundo é removido automaticamente.'}
        </span>
        <div className="inline-flex w-fit rounded-md border border-[color:var(--border-default)] bg-white p-0.5">
          {(['ia', 'upload'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setModo(opt)}
              disabled={disabled}
              aria-pressed={atriz.modo === opt}
              className={[
                'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                atriz.modo === opt
                  ? 'bg-[#553679] text-white'
                  : 'text-[color:var(--text-secondary)] hover:bg-[#F4F4F2]',
                disabled ? 'cursor-not-allowed opacity-50' : '',
              ].join(' ')}
            >
              {opt === 'ia' ? 'IA (automático)' : 'Upload'}
            </button>
          ))}
        </div>
      </div>

      {atriz.modo === 'ia' && (
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-xs font-medium">
            Detalhes adicionais (opcional)
            <TooltipInfo text="Detalhes adicionais pra atriz (ex.: 'cabelo cacheado', 'óculos'). Opcional. Idade ~35-45 sempre forçada." />
          </label>
          <Textarea
            value={atriz.modo === 'ia' ? atriz.detalhes ?? '' : ''}
            onChange={(e) =>
              form.setValue('atriz', { modo: 'ia', detalhes: e.target.value || undefined }, { shouldValidate: true })
            }
            disabled={disabled}
            placeholder="Ex.: cabelo longo cacheado, óculos discretos"
            rows={2}
            maxLength={500}
            className="text-sm"
          />
        </div>
      )}

      {atriz.modo === 'upload' && (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-xs font-medium">
            Arquivo (PNG/JPG, máx 5MB) *
            <TooltipInfo text="Upload de PNG da atriz. Fundo será removido automaticamente (rembg). 1 arquivo." />
          </label>

          {!uploadPreview ? (
            <label
              className={[
                'flex h-32 cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-[color:var(--border-default)] bg-[color:var(--bg-tertiary)] text-sm text-[color:var(--text-secondary)] transition',
                disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-[#553679] hover:text-[#553679]',
              ].join(' ')}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={onFileChange}
                disabled={disabled}
                className="hidden"
              />
              <Upload size={18} />
              Clique pra enviar
            </label>
          ) : (
            <div className="flex items-start gap-3">
              <div className="relative h-32 w-32 overflow-hidden rounded-md border border-[color:var(--border-default)]">
                <Image src={uploadPreview} alt="preview" fill className="object-cover" unoptimized />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[color:var(--text-primary)]">{uploadName}</span>
                <button
                  type="button"
                  onClick={clearUpload}
                  disabled={disabled}
                  className="flex w-fit items-center gap-1 text-[11px] text-[#A32D2D] hover:underline disabled:opacity-50"
                >
                  <X size={12} /> Remover
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
