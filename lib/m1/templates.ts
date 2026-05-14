import type { M1Movel, M1TipoFoto } from './schema'

// Templates Detalhe Tecido têm 2 imagens internas (close + zoom) que são
// renderizadas separadamente e compostas side-by-side via Sharp.
// Os demais templates têm 1 imagem só. Discriminated union evita any.

type M1TemplateBase = {
  id: string
  movel: M1Movel
  tipoFoto: M1TipoFoto
  ordem: number
  nome: string
  descricao: string
  thumbnailPath: string
}

export type M1TemplateSimple = M1TemplateBase & {
  variant: 'simple'
  imagePath: string
  maskPath: string
}

export type M1TemplateSplit = M1TemplateBase & {
  variant: 'split'
  imageClosePath: string
  maskClosePath: string
  imageZoomPath: string
  maskZoomPath: string
}

export type M1Template = M1TemplateSimple | M1TemplateSplit

function simple(
  id: string,
  movel: M1Movel,
  tipoFoto: M1TipoFoto,
  ordem: number,
  nome: string,
  descricao: string
): M1TemplateSimple {
  return {
    variant: 'simple',
    id,
    movel,
    tipoFoto,
    ordem,
    nome,
    descricao,
    imagePath: `/templates/m1/${id}/image.png`,
    maskPath: `/templates/m1/${id}/mask.png`,
    thumbnailPath: `/templates/m1/${id}/thumbnail.webp`,
  }
}

function split(
  id: string,
  movel: M1Movel,
  ordem: number,
  nome: string,
  descricao: string
): M1TemplateSplit {
  return {
    variant: 'split',
    id,
    movel,
    tipoFoto: 'detalhe-tecido',
    ordem,
    nome,
    descricao,
    imageClosePath: `/templates/m1/${id}/image-close.png`,
    maskClosePath: `/templates/m1/${id}/mask-close.png`,
    imageZoomPath: `/templates/m1/${id}/image-zoom.png`,
    maskZoomPath: `/templates/m1/${id}/mask-zoom.png`,
    thumbnailPath: `/templates/m1/${id}/thumbnail.webp`,
  }
}

export const M1_TEMPLATES: M1Template[] = [
  // ─── Sofá · Capa (2) ─────────────────────────
  simple('sofa-capa-1', 'sofa', 'capa', 1, 'Sofá 1', 'Sala moderna minimalista — quadro geométrico, planta, prateleira'),
  simple('sofa-capa-2', 'sofa', 'capa', 2, 'Sofá 2', 'Sala boho contemporânea — quadro abstrato, abajur dourado'),

  // ─── Sofá · Ambiente (2) ─────────────────────
  simple('sofa-ambiente-1', 'sofa', 'ambiente', 1, 'Sofá 1', '2 sofás (2+3 lugares) — sala contemporânea com espelho e planta'),
  simple('sofa-ambiente-2', 'sofa', 'ambiente', 2, 'Sofá 2', '2 sofás (2+3 lugares) — sala clean moderna com cortina padronizada'),

  // ─── Sofá · Elástico (2) ─────────────────────
  simple('sofa-elastico-1', 'sofa', 'elastico', 1, 'Sofá 1', 'Close de mão esticando a capa no braço do sofá'),
  simple('sofa-elastico-2', 'sofa', 'elastico', 2, 'Sofá 2', 'Close de mão esticando a capa no encosto do sofá'),

  // ─── Sofá · Detalhe Tecido (1, split close+zoom) ─
  split('sofa-detalhe-1', 'sofa', 1, 'Sofá 1', 'Split close+zoom — mãos puxando a capa e macro da costura'),

  // ─── Cadeira · Capa (2) ──────────────────────
  simple('cadeira-capa-1', 'cadeira', 'capa', 1, 'Cadeira 1', 'Sala de leitura — cortina bege, planta, banco dourado'),
  simple('cadeira-capa-2', 'cadeira', 'capa', 2, 'Cadeira 2', 'Sala de jantar light — cortina branca, mesa lateral com flores'),

  // ─── Cadeira · Ambiente (2) ──────────────────
  simple('cadeira-ambiente-1', 'cadeira', 'ambiente', 1, 'Cadeira 1', 'Mesa com 6 cadeiras — sala elegante com abajur e cortina branca'),
  simple('cadeira-ambiente-2', 'cadeira', 'ambiente', 2, 'Cadeira 2', 'Mesa com 6 cadeiras — sala sofisticada com painel decorativo'),

  // ─── Cadeira · Elástico (2) ──────────────────
  simple('cadeira-elastico-1', 'cadeira', 'elastico', 1, 'Cadeira 1', 'Close de mão esticando a capa no encosto da cadeira'),
  simple('cadeira-elastico-2', 'cadeira', 'elastico', 2, 'Cadeira 2', 'Close de mão esticando a capa no assento da cadeira'),

  // ─── Cadeira · Detalhe Tecido (1, split close+zoom) ─
  split('cadeira-detalhe-1', 'cadeira', 1, 'Cadeira 1', 'Split close+zoom — mãos puxando a capa e macro da costura'),
]

export function getTemplatesPorMovelETipo(
  movel: M1Movel,
  tipoFoto: M1TipoFoto
): M1Template[] {
  return M1_TEMPLATES.filter((t) => t.movel === movel && t.tipoFoto === tipoFoto)
}

export function getTemplateById(id: string): M1Template | undefined {
  return M1_TEMPLATES.find((t) => t.id === id)
}
