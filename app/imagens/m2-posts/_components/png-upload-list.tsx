'use client'

import { UploadField } from '@/components/upload-field'

interface PngUploadListProps {
  value: (string | null)[]
  onChange: (next: (string | null)[]) => void
  /** Total de slots a renderizar. Default 3 (modo IA). 8 no modo upload. */
  maxSlots?: number
  /** Se true, o primeiro slot aparece como obrigatório (label sem "opcional"). */
  firstRequired?: boolean
  disabled?: boolean
}

/**
 * Grid de slots de upload de PNG. Slots vazios são filtrados antes de enviar
 * à API. Aceita PNG/JPG até 10MB cada (regra de /api/upload). Upload é
 * server-side via /api/upload (ARCH §8 — nunca @vercel/blob/client.upload).
 */
export function PngUploadList({
  value,
  onChange,
  maxSlots = 3,
  firstRequired = false,
  disabled,
}: PngUploadListProps) {
  const slots = Array.from({ length: maxSlots }, (_, i) => value[i] ?? null)

  function setSlot(index: number, url: string | null) {
    const next = [...slots]
    next[index] = url
    onChange(next)
  }

  // 3 colunas pra até 6, depois 4 colunas pra caber 8 sem ficar enorme.
  const gridCols = maxSlots <= 6 ? 'grid-cols-3' : 'grid-cols-4'

  return (
    <div className={`grid ${gridCols} gap-3`}>
      {slots.map((url, i) => {
        const isFirst = i === 0
        const label = isFirst
          ? `Referência ${i + 1}${firstRequired ? '' : ' (opcional)'}`
          : `Referência ${i + 1} (opcional)`
        return (
          <UploadField
            key={i}
            label={label}
            hint="PNG/JPG · até 10MB"
            value={url}
            onChange={(next) => setSlot(i, next)}
            disabled={disabled}
          />
        )
      })}
    </div>
  )
}
