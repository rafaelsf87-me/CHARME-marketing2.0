// Banco curado de decorações pro M3 — Microsoft Fluent Emoji 3D (MIT).
// Repo: https://github.com/microsoft/fluentui-emoji
// 13 assets PNG 256×256 com alpha real, baixados em 2026-05-17.
// Curadoria inicial cobre: corações (4), itens promo (cartão, dinheiro,
// presente), comemoração (foguete, confete, coroa, estrela), natalino
// (papai-noel = Mx claus default), floral (cherry blossom). Ver DEC-M3-004.
//
// CLIENT-SAFE: este arquivo NÃO importa fs/path — o array DECORACOES_BANCO
// pode ser consumido por componentes client (form-decoracoes.tsx).
// `loadDecoracao()` mora em `decoracoes-banco-server.ts` (server-only).

export interface DecoracaoBancoItem {
  id: string
  nomePtBr: string
  filename: string
  tags: readonly string[]
}

export const DECORACOES_BANCO: readonly DecoracaoBancoItem[] = [
  { id: 'coracao-rosa', nomePtBr: 'Coração rosa', filename: 'coracao-rosa.png', tags: ['heart', 'love', 'romantic'] },
  { id: 'coracao-vermelho', nomePtBr: 'Coração vermelho', filename: 'coracao-vermelho.png', tags: ['heart', 'love'] },
  { id: 'coracao-decoracao', nomePtBr: 'Coração com fita', filename: 'coracao-decoracao.png', tags: ['heart', 'love', 'gift'] },
  { id: 'coracao-batendo', nomePtBr: 'Coração batendo', filename: 'coracao-batendo.png', tags: ['heart', 'love'] },
  { id: 'foguete', nomePtBr: 'Foguete', filename: 'foguete.png', tags: ['rocket', 'fast', 'launch'] },
  { id: 'presente', nomePtBr: 'Presente', filename: 'presente.png', tags: ['gift', 'celebrate'] },
  { id: 'cartao', nomePtBr: 'Cartão de crédito', filename: 'cartao.png', tags: ['payment', 'card', 'money'] },
  { id: 'dinheiro', nomePtBr: 'Dinheiro', filename: 'dinheiro.png', tags: ['money', 'cash', 'payment'] },
  { id: 'papai-noel', nomePtBr: 'Papai Noel', filename: 'papai-noel.png', tags: ['christmas', 'holiday'] },
  { id: 'flor-cerejeira', nomePtBr: 'Flor de cerejeira', filename: 'flor-cerejeira.png', tags: ['flower', 'spring', 'pink'] },
  { id: 'estrela', nomePtBr: 'Estrela brilhante', filename: 'estrela.png', tags: ['star', 'celebrate', 'shine'] },
  { id: 'confete', nomePtBr: 'Bola de confete', filename: 'confete.png', tags: ['confetti', 'celebrate', 'party'] },
  { id: 'coroa', nomePtBr: 'Coroa', filename: 'coroa.png', tags: ['crown', 'premium', 'royal'] },
]

export function getDecoracaoById(id: string): DecoracaoBancoItem | undefined {
  return DECORACOES_BANCO.find((d) => d.id === id)
}
