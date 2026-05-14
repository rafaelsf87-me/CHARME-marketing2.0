'use client'

import { UploadField } from '@/components/upload-field'
import { TooltipInfo } from '@/components/tooltip-info'
import { getUploadLabel } from '@/lib/m1/tooltips'
import type { M1TipoFoto } from '@/lib/m1/schema'

interface StepUploadReferenciaProps {
  tipoFoto: M1TipoFoto | null
  value: string | null
  onChange: (url: string | null) => void
}

export function StepUploadReferencia({
  tipoFoto,
  value,
  onChange,
}: StepUploadReferenciaProps) {
  const { label, hint, tooltip } = getUploadLabel(tipoFoto)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">{label}</span>
        <TooltipInfo text={tooltip} />
      </div>
      <UploadField label="" hint={hint} value={value} onChange={onChange} />
    </div>
  )
}
