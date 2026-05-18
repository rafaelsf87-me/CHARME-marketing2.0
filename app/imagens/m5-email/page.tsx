import { Mail } from 'lucide-react'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { ModuleHeader } from '@/components/layout/module-header'

export default function M5Page() {
  return (
    <div className="px-10 py-9">
      <Breadcrumb items={[{ label: 'Geração de Imagens' }, { label: 'Banners Emails' }]} />
      <ModuleHeader
        icon={Mail}
        title="Banners Emails"
        description="Em construção — escopo a definir em sessão futura (DEC-002)."
      />
    </div>
  )
}
