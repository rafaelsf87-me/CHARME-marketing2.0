'use client'

import * as React from 'react'
import { TabSwitcher, type M2Tab } from './tab-switcher'
import { TemplateSelector } from './template-selector'
import { FormImagemUnica } from './form-imagem-unica'
import { FormCarrossel } from './form-carrossel'
import { T2Form } from './t2-form/t2-form'
import { V2Form } from './v2-form'
import type { M2TemplateId } from '@/lib/m2/schema'

export function M2Form() {
  const [templateId, setTemplateId] = React.useState<M2TemplateId>('pipeline-hibrido-v2')
  const [tab, setTab] = React.useState<M2Tab>('imagem-unica')

  const isT2 = templateId === 'pipeline-hibrido-v2'
  const isV2 = templateId === 'v2-fixos'

  return (
    <div className="flex flex-col gap-6">
      <TemplateSelector value={templateId} onChange={setTemplateId} />

      {isV2 ? (
        <V2Form />
      ) : isT2 ? (
        // T2 tem TabSwitcher próprio dentro de T2Form (IU/Carrossel)
        <T2Form />
      ) : (
        <>
          <TabSwitcher value={tab} onChange={setTab} />
          {tab === 'imagem-unica' ? (
            <FormImagemUnica templateId={templateId} />
          ) : (
            <FormCarrossel templateId={templateId} />
          )}
        </>
      )}
    </div>
  )
}
