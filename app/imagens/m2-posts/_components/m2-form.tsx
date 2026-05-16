'use client'

import * as React from 'react'
import { TabSwitcher, type M2Tab } from './tab-switcher'
import { TemplateSelector } from './template-selector'
import { FormImagemUnica } from './form-imagem-unica'
import { FormCarrossel } from './form-carrossel'
import type { M2TemplateId } from '@/lib/m2/schema'

export function M2Form() {
  const [templateId, setTemplateId] = React.useState<M2TemplateId>('atual-maio26')
  const [tab, setTab] = React.useState<M2Tab>('imagem-unica')

  return (
    <div className="flex flex-col gap-6">
      <TemplateSelector value={templateId} onChange={setTemplateId} />
      <TabSwitcher value={tab} onChange={setTab} />

      {tab === 'imagem-unica' ? (
        <FormImagemUnica templateId={templateId} />
      ) : (
        <FormCarrossel templateId={templateId} />
      )}
    </div>
  )
}
