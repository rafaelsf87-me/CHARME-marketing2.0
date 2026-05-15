'use client'

import { UploadField } from '@/components/upload-field'
import { TooltipInfo } from '@/components/tooltip-info'
import { M1_TOOLTIPS } from '@/lib/m1/tooltips'

interface StepUploadReferenciaProps {
  value: string | null
  onChange: (url: string | null) => void
}

// Sempre upload da foto-referência da ESTAMPA (não mais foto bruta de celular).
// Para Capa Lisa, este componente não é renderizado — usa StepCorLisa.
export function StepUploadReferencia({ value, onChange }: StepUploadReferenciaProps) {
  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">Foto do rolo de tecido</span>
        <TooltipInfo text={M1_TOOLTIPS.uploadCapa} />
      </div>
      <UploadField
        label=""
        hint="Foto plana do rolo de tecido (estampa esticada em fundo neutro). Mostre 10–20 repetições do padrão. Câmera perpendicular, sem flash, iluminação difusa."
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
