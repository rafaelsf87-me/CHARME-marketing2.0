import type { Template } from '../../types'

// Placeholder oficial — direção a definir após T1 atual-maio26 estar ativo
// em prod (ver DEC-M3-005 em DIVIDAS). Card visível na UI como disabled
// com badge "em construção".
export const novoTeste1: Template = {
  id: 'novo-teste-1',
  nome: 'Novo_Teste1',
  descricao: 'Slot pra segundo template do M3. Direção a definir após T1 ativo.',
  status: 'placeholder',
  pipeline: 'a-definir',
}
