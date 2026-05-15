'use client'

import { UploadField } from '@/components/upload-field'
import { TooltipInfo } from '@/components/tooltip-info'
import { M1_TOOLTIPS } from '@/lib/m1/tooltips'

interface StepUploadsPatternProps {
  fotoSofa: string | null
  fotoRolo: string | null
  onChangeSofa: (url: string | null) => void
  onChangeRolo: (url: string | null) => void
}

// Estampada / Alto Relevo: 2 uploads.
// fotoSofa: obrigatório — sofá-padrão da empresa com a estampa (define escala).
// fotoRolo: opcional/recomendado — foto plana do rolo (clean source p/ cor e textura).
export function StepUploadsPattern({
  fotoSofa,
  fotoRolo,
  onChangeSofa,
  onChangeRolo,
}: StepUploadsPatternProps) {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">
            Foto do sofá padrão com a estampa
            <span className="ml-1 text-[#A32D2D]">*</span>
          </span>
          <TooltipInfo text={M1_TOOLTIPS.uploadSofa} />
        </div>
        <UploadField
          label=""
          hint="Sofá padrão da empresa com esta estampa aplicada. Use sempre o mesmo sofá padrão."
          value={fotoSofa}
          onChange={onChangeSofa}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[color:var(--text-secondary)]">
            Foto do rolo de tecido
            <span className="ml-1 text-[10.5px] font-normal text-[color:var(--text-tertiary)]">
              (recomendado)
            </span>
          </span>
          <TooltipInfo text={M1_TOOLTIPS.uploadRolo} />
        </div>
        <UploadField
          label=""
          hint="Foto plana do rolo, ~10–20 repetições do padrão, câmera perpendicular, luz difusa."
          value={fotoRolo}
          onChange={onChangeRolo}
        />
      </div>
    </div>
  )
}
