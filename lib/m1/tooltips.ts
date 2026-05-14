export const M1_TOOLTIPS = {
  tipoCapaEstampada:
    'Capa com padrão impresso 2D (estampas geométricas, florais, etc.). A IA replica o padrão EXATAMENTE como na foto enviada.',
  tipoCapaLisa:
    'Capa em cor uniforme, sem padrão. A IA aplica a cor exata da foto enviada, mantendo a textura de malha poliéster.',
  tipoCapaAltoRelevo:
    'Capa com padrão 3D bordado/quiltado no tecido (não impresso). A IA preserva o relevo e a cor uniforme da foto enviada.',
  tipoFotoCapa:
    'Foto principal do produto: móvel com capa aplicada no cenário pré-aprovado.',
  tipoFotoAmbiente:
    'Foto ampla do ambiente com 2 sofás ou mesa com 6 cadeiras, todas com a mesma capa.',
  tipoFotoElastico:
    'Close da mão esticando a capa vestida no móvel. Demonstra elasticidade do tecido.',
  tipoFotoDetalheTecido:
    'Detalhe das costuras + verso da capa + assento original embaixo. Comunica qualidade do produto e facilidade de vestir.',
  cenario:
    'Escolha o cenário pré-aprovado onde a capa será aplicada. O ambiente, o ângulo e a iluminação são mantidos. A IA substitui apenas a estampa/cor do móvel pela sua referência.',
  uploadCapa:
    'Foto pronta da capa, usada apenas para ajuste e padronização da estampa/cor. PNG ou JPEG, até 10MB. Quanto melhor a qualidade da foto, mais fiel o resultado.',
  uploadElastico:
    'Foto de celular mostrando uma mão esticando a capa vestida no móvel. A IA limpa a foto, melhora a iluminação e o fundo. Não recria a cena.',
  uploadDetalheTecido:
    'Foto de celular mostrando a mão levantando a capa, com o assento original do móvel aparecendo. A IA limpa a foto e foca no detalhe da costura. Mantém o assento visível para comunicar antes/depois.',
  customization:
    "Ajustes visuais livres. Ex: 'mais luz natural', 'menos saturação'. A IA aplica dentro do padrão do template — sem alterar a estampa nem o cenário.",
  botaoGerar:
    'Gera a foto WEBP 1080×1080 pronta para upload no Shopify. Processo leva entre 8 e 18 segundos.',
} as const

import type { M1TipoFoto } from './schema'

export function getUploadLabel(tipoFoto: M1TipoFoto | null): {
  label: string
  hint: string
  tooltip: string
} {
  if (tipoFoto === 'elastico') {
    return {
      label: 'Foto bruta da ação esticando',
      hint: 'Foto de celular mostrando a mão esticando a capa no móvel.',
      tooltip: M1_TOOLTIPS.uploadElastico,
    }
  }
  if (tipoFoto === 'detalhe-tecido') {
    return {
      label: 'Foto bruta puxando a capa',
      hint: 'Foto de celular mostrando a mão levantando a capa, com o assento original aparecendo.',
      tooltip: M1_TOOLTIPS.uploadDetalheTecido,
    }
  }
  // Default (capa ou ambiente)
  return {
    label: 'Foto de referência da capa',
    hint: 'Foto pronta da capa, usada apenas para ajuste e padronização.',
    tooltip: M1_TOOLTIPS.uploadCapa,
  }
}
