import type { M1Movel, M1TipoFoto } from './schema'

// v1.3 — lógica de Sets:
// Cada (móvel, tipoFoto) tem até 2 templates (Set 1 e Set 2). Usuário escolhe
// "Set" uma única vez e o sistema resolve o template via getTemplate().
// Exceção: Sofá Detalhe Tecido tem apenas Set 1 (split close+zoom). Quando o
// usuário pede Sofá Detalhe Tecido em Set 2, retornamos silenciosamente o
// Set 1 — documentado no JSDoc de getTemplate.

export type M1Set = 1 | 2

// Templates Detalhe Tecido SOFÁ têm 2 imagens internas (close + zoom) que são
// renderizadas separadamente e compostas side-by-side via Sharp. Cadeira
// Detalhe Tecido usa variant=simple (foto única).

type M1TemplateBase = {
  id: string
  movel: M1Movel
  tipoFoto: M1TipoFoto
  set: M1Set
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
  set: M1Set,
  ordem: number,
  nome: string,
  descricao: string
): M1TemplateSimple {
  return {
    variant: 'simple',
    id,
    movel,
    tipoFoto,
    set,
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
  set: M1Set,
  ordem: number,
  nome: string,
  descricao: string
): M1TemplateSplit {
  return {
    variant: 'split',
    id,
    movel,
    tipoFoto: 'detalhe-tecido',
    set,
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
  // ─── Sofá · Set 1 ────────────────────────────
  simple('sofa-capa-1',     'sofa', 'capa',     1, 1, 'Sofá Capa 1',     'Sala moderna minimalista — quadro geométrico, planta, prateleira'),
  simple('sofa-ambiente-1', 'sofa', 'ambiente', 1, 1, 'Sofá Ambiente 1', '2 sofás (2+3 lugares) — sala contemporânea com espelho e planta'),
  simple('sofa-elastico-1', 'sofa', 'elastico', 1, 1, 'Sofá Elástico 1', 'Close de mão esticando a capa no braço do sofá'),
  split( 'sofa-detalhe-1',  'sofa',             1, 1, 'Sofá Detalhe 1',  'Split close+zoom — mãos puxando a capa e macro da costura'),

  // ─── Sofá · Set 2 ────────────────────────────
  simple('sofa-capa-2',     'sofa', 'capa',     2, 2, 'Sofá Capa 2',     'Sala boho contemporânea — quadro abstrato, abajur dourado'),
  simple('sofa-ambiente-2', 'sofa', 'ambiente', 2, 2, 'Sofá Ambiente 2', '2 sofás (2+3 lugares) — sala clean moderna com cortina padronizada'),
  simple('sofa-elastico-2', 'sofa', 'elastico', 2, 2, 'Sofá Elástico 2', 'Close de mão esticando a capa no encosto do sofá'),
  // (Sofá Detalhe Set 2 não existe — fallback para Set 1 documentado em getTemplate.)

  // ─── Cadeira · Set 1 ─────────────────────────
  simple('cadeira-capa-1',     'cadeira', 'capa',           1, 1, 'Cadeira Capa 1',     'Sala de leitura — cortina bege, planta, banco dourado'),
  simple('cadeira-ambiente-1', 'cadeira', 'ambiente',       1, 1, 'Cadeira Ambiente 1', 'Mesa com 6 cadeiras — sala elegante com abajur e cortina branca'),
  simple('cadeira-elastico-1', 'cadeira', 'elastico',       1, 1, 'Cadeira Elástico 1', 'Close de mão esticando a capa no encosto da cadeira'),
  simple('cadeira-detalhe-1',  'cadeira', 'detalhe-tecido', 1, 1, 'Cadeira Detalhe 1',  'Mãos puxando capa em cadeira, mostrando costura e assento original'),

  // ─── Cadeira · Set 2 ─────────────────────────
  simple('cadeira-capa-2',     'cadeira', 'capa',           2, 2, 'Cadeira Capa 2',     'Sala de jantar light — cortina branca, mesa lateral com flores'),
  simple('cadeira-ambiente-2', 'cadeira', 'ambiente',       2, 2, 'Cadeira Ambiente 2', 'Mesa com 6 cadeiras — sala sofisticada com painel decorativo'),
  simple('cadeira-elastico-2', 'cadeira', 'elastico',       2, 2, 'Cadeira Elástico 2', 'Close de mão esticando a capa no assento da cadeira'),
  simple('cadeira-detalhe-2',  'cadeira', 'detalhe-tecido', 2, 2, 'Cadeira Detalhe 2',  'Cadeira com capa em ângulo alternativo, foco em encaixe e textura'),
]

/**
 * Resolve o template a partir de (móvel, tipoFoto, set).
 *
 * Fallback documentado: **Sofá Detalhe Tecido só existe no Set 1** (split
 * close+zoom). Quando chamada com (sofa, detalhe-tecido, 2), esta função
 * retorna `sofa-detalhe-1` silenciosamente. Esse fallback existe porque
 * fotografar duas variações de split-screen seria caro e a coerência do
 * Set 2 já está garantida pelos outros 3 tipos de foto.
 */
export function getTemplate(
  movel: M1Movel,
  tipoFoto: M1TipoFoto,
  set: M1Set
): M1Template {
  const exact = M1_TEMPLATES.find(
    (t) => t.movel === movel && t.tipoFoto === tipoFoto && t.set === set
  )
  if (exact) return exact

  // Fallback: Sofá Detalhe Tecido Set 2 → Set 1.
  if (movel === 'sofa' && tipoFoto === 'detalhe-tecido') {
    const fallback = M1_TEMPLATES.find(
      (t) => t.movel === 'sofa' && t.tipoFoto === 'detalhe-tecido' && t.set === 1
    )
    if (fallback) return fallback
  }

  throw new Error(
    `Template não encontrado para movel=${movel} tipoFoto=${tipoFoto} set=${set}`
  )
}

export function getTemplateById(id: string): M1Template | undefined {
  return M1_TEMPLATES.find((t) => t.id === id)
}
