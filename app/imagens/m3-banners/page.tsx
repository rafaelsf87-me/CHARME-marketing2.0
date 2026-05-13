import { Breadcrumb } from '@/components/layout/breadcrumb'

export default function M3Page() {
  return (
    <div className="px-10 py-9">
      <Breadcrumb items={[{ label: 'Geração de Imagens' }, { label: 'M3 · Banners' }]} />
      <h1 className="m-0 text-[26px] font-medium tracking-[-0.025em]">Banners Website</h1>
      <p className="mt-2 text-sm text-[color:var(--text-secondary)]">Em desenvolvimento.</p>
    </div>
  )
}
