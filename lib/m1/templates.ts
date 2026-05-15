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
  // Dimensões físicas REAIS do móvel mostrado no template (cm).
  // Usadas no prompt do nano-banana pra calcular o ratio de repetições
  // do padrão entre REF-2 (foto-sofá usuário) e REF-1 (template).
  // Valores reais fornecidos por Rafael em 17/05/2026 — não estimar.
  physicalWidthCm: number
  // Largura ÚTIL entre os braços (zona onde aparece padrão). Usada pelo
  // bloco HORIZONTAL PATTERN COLUMNS do prompt — mais preditiva que a
  // largura total porque os braços não contam pra contagem de colunas.
  physicalInnerWidthCm: number
  physicalHeightCm: number
}

// Dimensões físicas reais fornecidas por Rafael em 17/05/2026 — não estimar.
// Sofá 3-lugares: total 220 / interno 180 / altura 100.
// Cadeira de jantar: total 55 / interno 45 / altura 100.
const PHYSICAL_DEFAULTS: Record<
  M1Movel,
  { widthCm: number; innerWidthCm: number; heightCm: number }
> = {
  sofa: { widthCm: 220, innerWidthCm: 180, heightCm: 100 },
  cadeira: { widthCm: 55, innerWidthCm: 45, heightCm: 100 },
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
  const dims = PHYSICAL_DEFAULTS[movel]
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
    physicalWidthCm: dims.widthCm,
    physicalInnerWidthCm: dims.innerWidthCm,
    physicalHeightCm: dims.heightCm,
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
  const dims = PHYSICAL_DEFAULTS[movel]
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
    physicalWidthCm: dims.widthCm,
    physicalInnerWidthCm: dims.innerWidthCm,
    physicalHeightCm: dims.heightCm,
  }
}

// Vestindo a Capa reusa o image-close.png de sofa-detalhe-1 como REF-1 pra
// fornecer ao modelo um cenário de "ação no tecido" (close de mãos+tecido)
// que ele extrapola — junto com o bloco DRESSING ACTION + STRICT — pra gerar
// o sofá 3-lugares em ângulo dramático sendo vestido. Mask e thumbnail
// herdadas do mesmo template detalhe-1. Apenas sofá; sem Set 2 por ora.
function sofaVestindoCapa1(): M1TemplateSimple {
  const dims = PHYSICAL_DEFAULTS.sofa
  return {
    variant: 'simple',
    id: 'sofa-vestindo-capa-1',
    movel: 'sofa',
    tipoFoto: 'vestindo-capa',
    set: 1,
    ordem: 1,
    nome: 'Sofá Vestindo a Capa 1',
    descricao: 'Mão estendendo a capa parcialmente aplicada sobre o sofá 3-lugares',
    imagePath: '/templates/m1/sofa-detalhe-1/image-close.png',
    maskPath: '/templates/m1/sofa-detalhe-1/mask-close.png',
    thumbnailPath: '/templates/m1/sofa-detalhe-1/thumbnail.webp',
    physicalWidthCm: dims.widthCm,
    physicalInnerWidthCm: dims.innerWidthCm,
    physicalHeightCm: dims.heightCm,
  }
}

export const M1_TEMPLATES: M1Template[] = [
  // ─── Sofá · Set 1 ────────────────────────────
  simple('sofa-capa-1',     'sofa', 'capa',     1, 1, 'Sofá Capa 1',     'Sala moderna minimalista — quadro geométrico, planta, prateleira'),
  simple('sofa-ambiente-1', 'sofa', 'ambiente', 1, 1, 'Sofá Ambiente 1', '2 sofás (2+3 lugares) — sala contemporânea com espelho e planta'),
  simple('sofa-elastico-1', 'sofa', 'elastico', 1, 1, 'Sofá Elástico 1', 'Close de mão esticando a capa no braço do sofá'),
  split( 'sofa-detalhe-1',  'sofa',             1, 1, 'Sofá Detalhe 1',  'Split close+zoom — mãos puxando a capa e macro da costura'),
  sofaVestindoCapa1(),

  // ─── Sofá · Set 2 ────────────────────────────
  simple('sofa-capa-2',     'sofa', 'capa',     2, 2, 'Sofá Capa 2',     'Sala boho contemporânea — quadro abstrato, abajur dourado'),
  simple('sofa-ambiente-2', 'sofa', 'ambiente', 2, 2, 'Sofá Ambiente 2', '2 sofás (2+3 lugares) — sala clean moderna com cortina padronizada'),
  simple('sofa-elastico-2', 'sofa', 'elastico', 2, 2, 'Sofá Elástico 2', 'Close de mão esticando a capa no encosto do sofá'),
  // (Sofá Detalhe Set 2 não existe — fallback para Set 1 documentado em getTemplate.)
  // (Sofá Vestindo Set 2 não existe — fallback para Set 1 documentado em getTemplate.)

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

  // Fallback: Sofá Vestindo a Capa Set 2 → Set 1 (Set 2 não existe por ora).
  if (movel === 'sofa' && tipoFoto === 'vestindo-capa') {
    const fallback = M1_TEMPLATES.find(
      (t) => t.movel === 'sofa' && t.tipoFoto === 'vestindo-capa' && t.set === 1
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
