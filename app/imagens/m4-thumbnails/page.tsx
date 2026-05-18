import { PlaySquare } from 'lucide-react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { ModuleHeader } from '@/components/layout/module-header'
import { M4Form } from './_components/m4-form'

export default function M4Page() {
  return (
    <div className="max-w-[920px] px-10 pb-10 pt-9">
      <Breadcrumb items={[{ label: 'Geração de Imagens' }, { label: 'Thumb Vídeo Insta' }]} />

      <ModuleHeader
        icon={PlaySquare}
        title="Thumb Vídeo Insta"
        description="Inclua caixas de texto sobre uma imagem."
      />

      <M4Form />
    </div>
  )
}
