import { Breadcrumb } from '@/components/layout/breadcrumb'

export default function M5Page() {
  return (
    <div className="px-10 py-9">
      <Breadcrumb items={[{ label: 'Geração de Imagens' }, { label: 'M5 · Email' }]} />
      <h1 className="m-0 text-[26px] font-medium tracking-[-0.025em]">Banners Email</h1>
      <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
        Placeholder — escopo a definir em sessão futura (DEC-002).
      </p>
    </div>
  )
}
