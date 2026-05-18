/**
 * T2 Subtemplates — contratos de render
 *
 * Cada subtemplate em subtemplates/<id>.tsx exporta:
 *   - config: SubtemplateConfig (slots estáticos)
 *   - render: SubtemplateRenderFn (Satori tree)
 *
 * Padrão alinhado ao M3 (lib/m3/templates/atual-maio26/layout-*.tsx).
 */

import type {
  BackgroundConfig,
  ImageSlot,
  SubtemplateConfig,
  TextSlot,
} from '../types'

export interface SubtemplateRenderArgs {
  /** Background resolvido. Subtemplate usa `contrast` pra cor de texto. */
  background: BackgroundConfig
  textSlots: TextSlot[]
  imageSlots: ImageSlot[]
  /** Map de imageSlot.id → Buffer já preparado (asset PNG resolvido). */
  imageBuffers: Map<string, Buffer>
  /** Map de textSlot.id → fontSize final calculado pelo text-renderer. */
  resolvedFontSizes: Map<string, number>
}

/**
 * Função que constrói a árvore Satori do subtemplate.
 * Retorna o React element pra Satori.satoriToSVG ou similar.
 */
export type SubtemplateRenderFn = (args: SubtemplateRenderArgs) => React.ReactElement

export interface SubtemplateModule {
  config: SubtemplateConfig
  render: SubtemplateRenderFn
}
