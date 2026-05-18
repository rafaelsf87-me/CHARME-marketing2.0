import { Wand2 } from 'lucide-react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { ModuleHeader } from '@/components/layout/module-header'

export default function TemplateCreatorPage() {
  return (
    <div className="px-10 py-9">
      <Breadcrumb items={[{ label: 'Geração de Imagens' }, { label: 'Template Creator' }]} />
      <ModuleHeader
        icon={Wand2}
        title="Template Creator"
        description="Em construção — disponível após M1 / M2 / M3."
      />
    </div>
  )
}
