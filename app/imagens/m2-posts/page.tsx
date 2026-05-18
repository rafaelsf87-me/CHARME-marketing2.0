import { Instagram } from 'lucide-react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { ModuleHeader } from '@/components/layout/module-header'
import { M2Form } from './_components/m2-form'

export default function M2Page() {
  return (
    <div className="max-w-[920px] px-10 pb-10 pt-9">
      <Breadcrumb items={[{ label: 'Geração de Imagens' }, { label: 'Post Instagram' }]} />

      <ModuleHeader
        icon={Instagram}
        title="Post Instagram"
        description="Gere posts e carrosséis no formato 1080×1350 (4:5) com o template padronizado da loja."
      />

      <M2Form />
    </div>
  )
}
