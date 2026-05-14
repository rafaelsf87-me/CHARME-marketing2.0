import type { M1Movel } from './schema'

export type M1TipoFotoComCenario = 'capa' | 'ambiente'

export type M1Template = {
  id: string
  movel: M1Movel
  tipoFoto: M1TipoFotoComCenario
  ordem: number
  nome: string
  descricao: string
  imagePath: string
  maskPath: string
  thumbnailPath: string
}

export const M1_TEMPLATES: M1Template[] = [
  // ─── Foto Capa · Sofá ─────────────────────────
  {
    id: 'sofa-capa-1',
    movel: 'sofa',
    tipoFoto: 'capa',
    ordem: 1,
    nome: 'Sofá 1',
    descricao: 'Sala moderna minimalista — quadro geométrico, planta, prateleira',
    imagePath: '/templates/m1/sofa-capa-1/image.png',
    maskPath: '/templates/m1/sofa-capa-1/mask.png',
    thumbnailPath: '/templates/m1/sofa-capa-1/thumbnail.webp',
  },
  {
    id: 'sofa-capa-2',
    movel: 'sofa',
    tipoFoto: 'capa',
    ordem: 2,
    nome: 'Sofá 2',
    descricao: 'Sala boho contemporânea — quadro abstrato, abajur dourado',
    imagePath: '/templates/m1/sofa-capa-2/image.png',
    maskPath: '/templates/m1/sofa-capa-2/mask.png',
    thumbnailPath: '/templates/m1/sofa-capa-2/thumbnail.webp',
  },
  {
    id: 'sofa-capa-3',
    movel: 'sofa',
    tipoFoto: 'capa',
    ordem: 3,
    nome: 'Sofá 3',
    descricao: 'Sala clean orgânica — quadro Matisse, mesa redonda madeira',
    imagePath: '/templates/m1/sofa-capa-3/image.png',
    maskPath: '/templates/m1/sofa-capa-3/mask.png',
    thumbnailPath: '/templates/m1/sofa-capa-3/thumbnail.webp',
  },

  // ─── Foto Capa · Cadeira ──────────────────────
  {
    id: 'cadeira-capa-1',
    movel: 'cadeira',
    tipoFoto: 'capa',
    ordem: 1,
    nome: 'Cadeira 1',
    descricao: 'Sala de leitura — cortina bege, planta, banco dourado',
    imagePath: '/templates/m1/cadeira-capa-1/image.png',
    maskPath: '/templates/m1/cadeira-capa-1/mask.png',
    thumbnailPath: '/templates/m1/cadeira-capa-1/thumbnail.webp',
  },
  {
    id: 'cadeira-capa-2',
    movel: 'cadeira',
    tipoFoto: 'capa',
    ordem: 2,
    nome: 'Cadeira 2',
    descricao: 'Sala de jantar light — cortina branca, mesa lateral com flores',
    imagePath: '/templates/m1/cadeira-capa-2/image.png',
    maskPath: '/templates/m1/cadeira-capa-2/mask.png',
    thumbnailPath: '/templates/m1/cadeira-capa-2/thumbnail.webp',
  },
  {
    id: 'cadeira-capa-3',
    movel: 'cadeira',
    tipoFoto: 'capa',
    ordem: 3,
    nome: 'Cadeira 3',
    descricao: 'Sala estar clássica — sofá branco capitonê, lanterna, piso madeira',
    imagePath: '/templates/m1/cadeira-capa-3/image.png',
    maskPath: '/templates/m1/cadeira-capa-3/mask.png',
    thumbnailPath: '/templates/m1/cadeira-capa-3/thumbnail.webp',
  },

  // ─── Foto Ambiente · Sofá (2 templates) ───────
  {
    id: 'sofa-ambiente-1',
    movel: 'sofa',
    tipoFoto: 'ambiente',
    ordem: 1,
    nome: 'Sofá 1',
    descricao: '2 sofás (2+3 lugares) — sala contemporânea com espelho e planta',
    imagePath: '/templates/m1/sofa-ambiente-1/image.png',
    maskPath: '/templates/m1/sofa-ambiente-1/mask.png',
    thumbnailPath: '/templates/m1/sofa-ambiente-1/thumbnail.webp',
  },
  {
    id: 'sofa-ambiente-2',
    movel: 'sofa',
    tipoFoto: 'ambiente',
    ordem: 2,
    nome: 'Sofá 2',
    descricao: '2 sofás (2+3 lugares) — sala clean moderna com cortina padronizada',
    imagePath: '/templates/m1/sofa-ambiente-2/image.png',
    maskPath: '/templates/m1/sofa-ambiente-2/mask.png',
    thumbnailPath: '/templates/m1/sofa-ambiente-2/thumbnail.webp',
  },

  // ─── Foto Ambiente · Cadeira (3 templates) ────
  {
    id: 'cadeira-ambiente-1',
    movel: 'cadeira',
    tipoFoto: 'ambiente',
    ordem: 1,
    nome: 'Cadeira 1',
    descricao: 'Mesa com 6 cadeiras — sala elegante com abajur e cortina branca',
    imagePath: '/templates/m1/cadeira-ambiente-1/image.png',
    maskPath: '/templates/m1/cadeira-ambiente-1/mask.png',
    thumbnailPath: '/templates/m1/cadeira-ambiente-1/thumbnail.webp',
  },
  {
    id: 'cadeira-ambiente-2',
    movel: 'cadeira',
    tipoFoto: 'ambiente',
    ordem: 2,
    nome: 'Cadeira 2',
    descricao: 'Mesa com 6 cadeiras — sala sofisticada com painel decorativo',
    imagePath: '/templates/m1/cadeira-ambiente-2/image.png',
    maskPath: '/templates/m1/cadeira-ambiente-2/mask.png',
    thumbnailPath: '/templates/m1/cadeira-ambiente-2/thumbnail.webp',
  },
  {
    id: 'cadeira-ambiente-3',
    movel: 'cadeira',
    tipoFoto: 'ambiente',
    ordem: 3,
    nome: 'Cadeira 3',
    descricao: 'Mesa com 4 cadeiras — ambiente clean com piso laminado',
    imagePath: '/templates/m1/cadeira-ambiente-3/image.png',
    maskPath: '/templates/m1/cadeira-ambiente-3/mask.png',
    thumbnailPath: '/templates/m1/cadeira-ambiente-3/thumbnail.webp',
  },
]

export function getTemplatesPorMovelETipo(
  movel: M1Movel,
  tipoFoto: M1TipoFotoComCenario
): M1Template[] {
  return M1_TEMPLATES.filter((t) => t.movel === movel && t.tipoFoto === tipoFoto)
}

export function getTemplateById(id: string): M1Template | undefined {
  return M1_TEMPLATES.find((t) => t.id === id)
}
