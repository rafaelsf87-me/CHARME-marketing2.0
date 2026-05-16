import { atualMaio26 } from './atual-maio26/config'
import { atualMaio26New } from './atual-maio26-new/config'
import { novoTeste1 } from './novo-teste-1/config'
import type { Template } from './types'
import type { M2TemplateId } from '../schema'

const REGISTRY: Record<M2TemplateId, Template> = {
  'atual-maio26': atualMaio26,
  'atual-maio26-new': atualMaio26New,
  'novo-teste-1': novoTeste1,
}

export function getTemplate(id: M2TemplateId): Template {
  return REGISTRY[id]
}

export function listTemplates(): Template[] {
  return Object.values(REGISTRY)
}
