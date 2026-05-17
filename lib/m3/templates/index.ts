import type { Template } from '../types'
import { atualMaio26 } from './atual-maio26/config'
import { novoTeste1 } from './novo-teste-1/config'
import { novoTeste2 } from './novo-teste-2/config'

// Registry centralizado dos templates M3. Ordem aqui = ordem dos cards na UI.
// 1 ativo + 2 placeholders (DEC-M3-005).
export const M3_TEMPLATES: Template[] = [atualMaio26, novoTeste1, novoTeste2]

export function getTemplateById(id: string): Template | undefined {
  return M3_TEMPLATES.find((t) => t.id === id)
}

export function getActiveTemplate(id: string): Template {
  const tpl = getTemplateById(id)
  if (!tpl) throw new Error(`[M3] Template não encontrado: ${id}`)
  if (tpl.status !== 'ativo') {
    throw new Error(`[M3] Template ${id} é placeholder, não pode gerar`)
  }
  return tpl
}
