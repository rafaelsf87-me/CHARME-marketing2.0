import { Breadcrumb } from '@/components/layout/breadcrumb'
import { M1Form } from './_components/m1-form'

export default function M1Page() {
  return (
    <div className="max-w-[920px] px-10 pb-10 pt-9">
      <Breadcrumb items={[{ label: 'Geração de Imagens' }, { label: 'M1 · Foto Produto Vitrine' }]} />

      <h1 className="m-0 mb-1.5 text-[26px] font-medium leading-tight tracking-[-0.025em]">
        Foto Produto Vitrine
      </h1>
      <p className="mb-8 max-w-[460px] text-[13.5px] text-[color:var(--text-secondary)]">
        Gere fotos profissionais aplicando a nova estampa em cenários pré-aprovados.
      </p>

      <M1Form />
    </div>
  )
}
