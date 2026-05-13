import { Breadcrumb } from '@/components/layout/breadcrumb'

export default function M1Page() {
  return (
    <div className="px-10 py-9">
      <Breadcrumb items={[{ label: 'Geração de Imagens' }, { label: 'M1 · Vitrine' }]} />
      <h1 className="m-0 text-[26px] font-medium tracking-[-0.025em]">Foto Produto Vitrine</h1>
      <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
        Em desenvolvimento. Disponível após M4 e M2.
      </p>
    </div>
  )
}
