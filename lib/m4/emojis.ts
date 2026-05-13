export type Emoji3DCategory =
  | 'urgencia'
  | 'casa'
  | 'emocoes'
  | 'destaque'
  | 'decorativo'
  | 'acao'

export type Emoji3D = {
  id: string
  label: string
  category: Emoji3DCategory
  url: string
}

const BASE = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets'

function build(folder: string, file: string): string {
  return `${BASE}/${encodeURIComponent(folder)}/3D/${file}_3d.png`
}

/**
 * 30 emojis curados do Microsoft Fluent Emoji 3D, agrupados em 6 categorias.
 * NOTE: alguns nomes podem ter variação Default/Light/Dark no Fluent — se uma URL
 * retornar 404, ajustar para o caminho real do repositório upstream.
 */
export const CURATED_EMOJIS_3D: Emoji3D[] = [
  // Urgência / Tempo
  { id: 'stopwatch', label: 'Cronômetro', category: 'urgencia', url: build('Stopwatch', 'stopwatch') },
  { id: 'alarm-clock', label: 'Despertador', category: 'urgencia', url: build('Alarm clock', 'alarm_clock') },
  { id: 'fire', label: 'Fogo', category: 'urgencia', url: build('Fire', 'fire') },
  { id: 'warning', label: 'Atenção', category: 'urgencia', url: build('Warning', 'warning') },
  { id: 'hourglass-flowing', label: 'Ampulheta', category: 'urgencia', url: build('Hourglass done', 'hourglass_done') },

  // Casa / Limpeza
  { id: 'soap', label: 'Sabonete', category: 'casa', url: build('Soap', 'soap') },
  { id: 'broom', label: 'Vassoura', category: 'casa', url: build('Broom', 'broom') },
  { id: 'sparkles', label: 'Brilho', category: 'casa', url: build('Sparkles', 'sparkles') },
  { id: 'droplet', label: 'Gota', category: 'casa', url: build('Droplet', 'droplet') },
  { id: 'house', label: 'Casa', category: 'casa', url: build('House', 'house') },

  // Emoções
  { id: 'weary-face', label: 'Cansado', category: 'emocoes', url: build('Weary face', 'weary_face') },
  { id: 'star-struck', label: 'Encantado', category: 'emocoes', url: build('Star-struck', 'star-struck') },
  { id: 'smiling-hearts', label: 'Apaixonado', category: 'emocoes', url: build('Smiling face with hearts', 'smiling_face_with_hearts') },
  { id: 'open-mouth', label: 'Surpreso', category: 'emocoes', url: build('Face with open mouth', 'face_with_open_mouth') },
  { id: 'thinking', label: 'Pensativo', category: 'emocoes', url: build('Thinking face', 'thinking_face') },

  // Destaque
  { id: 'hundred', label: 'Cem', category: 'destaque', url: build('Hundred points', 'hundred_points') },
  { id: 'star', label: 'Estrela', category: 'destaque', url: build('Star', 'star') },
  { id: 'light-bulb', label: 'Lâmpada', category: 'destaque', url: build('Light bulb', 'light_bulb') },
  { id: 'bullseye', label: 'Alvo', category: 'destaque', url: build('Bullseye', 'bullseye') },
  { id: 'eyes', label: 'Olhos', category: 'destaque', url: build('Eyes', 'eyes') },

  // Decorativo
  { id: 'cherry-blossom', label: 'Cerejeira', category: 'decorativo', url: build('Cherry blossom', 'cherry_blossom') },
  { id: 'tulip', label: 'Tulipa', category: 'decorativo', url: build('Tulip', 'tulip') },
  { id: 'herb', label: 'Folha', category: 'decorativo', url: build('Herb', 'herb') },
  { id: 'butterfly', label: 'Borboleta', category: 'decorativo', url: build('Butterfly', 'butterfly') },
  { id: 'sparkling-heart', label: 'Coração', category: 'decorativo', url: build('Sparkling heart', 'sparkling_heart') },

  // Ação
  { id: 'check-mark', label: 'Confere', category: 'acao', url: build('Check mark', 'check_mark') },
  { id: 'cross-mark', label: 'Errado', category: 'acao', url: build('Cross mark', 'cross_mark') },
  { id: 'flexed-bicep', label: 'Força', category: 'acao', url: build('Flexed biceps', 'flexed_biceps_default') },
  { id: 'raising-hands', label: 'Comemora', category: 'acao', url: build('Raising hands', 'raising_hands_default') },
  { id: 'party-popper', label: 'Festa', category: 'acao', url: build('Party popper', 'party_popper') },
]

export const CATEGORY_LABELS: Record<Emoji3DCategory, string> = {
  urgencia: 'Urgência',
  casa: 'Casa & Limpeza',
  emocoes: 'Emoções',
  destaque: 'Destaque',
  decorativo: 'Decorativo',
  acao: 'Ação',
}

/** Atalhos exibidos na barra horizontal (sem abrir Dialog) */
export const QUICK_EMOJI_IDS: string[] = [
  'fire',
  'sparkles',
  'star-struck',
  'hundred',
  'check-mark',
  'party-popper',
]
