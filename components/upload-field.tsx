'use client'

import * as React from 'react'
import { upload } from '@vercel/blob/client'
import { Upload, ImageIcon, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface UploadFieldProps {
  label: string
  hint?: string
  accept?: string
  maxSizeBytes?: number
  value: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
  className?: string
}

type State = 'empty' | 'dragging' | 'uploading' | 'uploaded' | 'error'

export function UploadField({
  label,
  hint = 'PNG ou JPG · até 10MB',
  accept = 'image/png,image/jpeg',
  maxSizeBytes = 10 * 1024 * 1024,
  value,
  onChange,
  disabled,
  className,
}: UploadFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [state, setState] = React.useState<State>(value ? 'uploaded' : 'empty')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (value && state !== 'uploading') setState('uploaded')
    if (!value && state === 'uploaded') setState('empty')
  }, [value, state])

  async function handleFile(file: File) {
    setErrorMsg(null)
    if (file.size > maxSizeBytes) {
      setErrorMsg(`Arquivo excede ${Math.round(maxSizeBytes / 1024 / 1024)}MB`)
      setState('error')
      return
    }
    setState('uploading')
    try {
      const blob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })
      onChange(blob.url)
      setState('uploaded')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha no upload')
      setState('error')
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }

  function onRemove() {
    onChange(null)
    setState('empty')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-medium">{label}</label>

      {state === 'uploaded' && value ? (
        <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-lg border border-[color:var(--border-default)] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="h-full w-full object-contain" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-medium text-[#A32D2D] shadow hover:bg-white"
          >
            <X size={12} /> Remover
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-disabled={disabled}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              !disabled && inputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled) setState('dragging')
          }}
          onDragLeave={() => state === 'dragging' && setState('empty')}
          onDrop={onDrop}
          className={cn(
            'flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition',
            state === 'dragging'
              ? 'border-[#553679] bg-[#EEEDFE]/40'
              : 'border-[color:var(--border-default)] bg-white hover:border-[color:var(--border-strong)]',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {state === 'uploading' ? (
            <>
              <Loader2 size={20} className="animate-spin text-[#553679]" />
              <span className="text-xs text-[color:var(--text-secondary)]">Enviando...</span>
            </>
          ) : (
            <>
              {state === 'error' ? (
                <ImageIcon size={22} className="text-[#A32D2D]" />
              ) : (
                <Upload size={20} className="text-[color:var(--text-tertiary)]" />
              )}
              <div className="text-center">
                <div className="text-xs font-medium">Arraste a imagem ou clique para enviar</div>
                <div className="mt-0.5 text-[11px] text-[color:var(--text-tertiary)]">{hint}</div>
              </div>
            </>
          )}
        </div>
      )}

      {errorMsg && <span className="text-[11px] text-[#A32D2D]">{errorMsg}</span>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  )
}
