import { Breadcrumb } from '@/components/layout/breadcrumb'
import { M4Form } from './_components/m4-form'

export default function M4Page() {
  return (
    <div className="max-w-[920px] px-10 pb-10 pt-9">
      <Breadcrumb items={[{ label: 'Geração de Imagens' }, { label: 'M4 · Thumbnails' }]} />

      <h1 className="m-0 mb-1.5 text-[26px] font-medium leading-tight tracking-[-0.025em]">
        Thumbnails Feed Instagram
      </h1>
      <p className="mb-8 max-w-[460px] text-[13.5px] text-[color:var(--text-secondary)]">
        Inclua caixas de texto sobre uma imagem.
      </p>

      <M4Form />
    </div>
  )
}
