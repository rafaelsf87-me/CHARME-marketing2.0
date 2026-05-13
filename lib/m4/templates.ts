import type { M4Template } from './schema'

export type M4TemplateDef = {
  id: M4Template
  name: string
  description: string
  lines: 2 | 3
  /** Posição vertical em % da altura (centro do bloco) */
  verticalAnchorPercent: number
}

export const M4_TEMPLATE_DEFS: M4TemplateDef[] = [
  { id: 'v1-topo', name: 'Topo', description: 'Bloco no terço superior', lines: 2, verticalAnchorPercent: 22 },
  { id: 'v2-centro-alto', name: 'Centro-alto', description: 'Acima do meio', lines: 3, verticalAnchorPercent: 38 },
  { id: 'v3-centro', name: 'Centro', description: 'Meio exato', lines: 2, verticalAnchorPercent: 50 },
  { id: 'v4-centro-baixo', name: 'Centro-baixo', description: 'Abaixo do meio', lines: 3, verticalAnchorPercent: 62 },
  { id: 'v5-rodape', name: 'Rodapé', description: 'Bloco no terço inferior', lines: 2, verticalAnchorPercent: 78 },
]

export function getTemplateDef(id: M4Template): M4TemplateDef {
  const def = M4_TEMPLATE_DEFS.find((t) => t.id === id)
  if (!def) throw new Error(`Template ${id} não encontrado`)
  return def
}
