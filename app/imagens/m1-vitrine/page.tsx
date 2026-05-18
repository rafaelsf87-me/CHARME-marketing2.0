import { Sofa } from 'lucide-react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { ModuleHeader } from '@/components/layout/module-header'
import { M1Form } from './_components/m1-form'

export default function M1Page() {
  return (
    <div className="max-w-[920px] px-10 pb-10 pt-9">
      <Breadcrumb items={[{ label: 'Geração de Imagens' }, { label: 'Produtos Vitrine' }]} />

      <ModuleHeader
        icon={Sofa}
        title="Produtos Vitrine"
        description="Gere fotos profissionais aplicando a nova estampa em cenários pré-aprovados."
      />

      <M1Form />
    </div>
  )
}
