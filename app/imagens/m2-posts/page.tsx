import { Breadcrumb } from '@/components/layout/breadcrumb'
import { M2Form } from './_components/m2-form'

export default function M2Page() {
  return (
    <div className="max-w-[920px] px-10 pb-10 pt-9">
      <Breadcrumb items={[{ label: 'Geração de Imagens' }, { label: 'M2 · Posts Instagram' }]} />

      <h1 className="m-0 mb-1.5 text-[26px] font-medium leading-tight tracking-[-0.025em]">
        Posts Instagram
      </h1>
      <p className="mb-8 max-w-[520px] text-[13.5px] text-[color:var(--text-secondary)]">
        Gere posts e carrosséis no formato 1080×1350 (4:5) com o template padronizado da loja.
      </p>

      <M2Form />
    </div>
  )
}
