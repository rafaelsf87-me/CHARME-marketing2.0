import { Breadcrumb } from '@/components/layout/breadcrumb'

export default function TemplateCreatorPage() {
  return (
    <div className="px-10 py-9">
      <Breadcrumb items={[{ label: 'Geração de Imagens' }, { label: 'Template Creator' }]} />
      <h1 className="m-0 text-[26px] font-medium tracking-[-0.025em]">Template Creator</h1>
      <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
        Em desenvolvimento — disponível após M1 / M2 / M3.
      </p>
    </div>
  )
}
