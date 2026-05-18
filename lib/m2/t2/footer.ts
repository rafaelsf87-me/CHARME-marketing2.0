/**
 * T2 Footer — wrap fino sobre lib/m2/footer-gen.ts existente
 *
 * footer-gen.ts já produz overlay PNG transparente com logo + @handle.
 * T2 só decide qual M2LogoOption usar.
 *
 * Output: Buffer 1080×120 (footer height fixo no footer-gen.ts).
 * Compose.ts posiciona em y=1190 (1350 - 40 margin bottom - 120 height).
 */

import { generateFooterOverlay } from '../footer-gen'
import { T2_CANVAS_WIDTH } from './types'
import type { SlidePlanFooter } from './types'

export interface RenderFooterArgs {
  logo: SlidePlanFooter['logo']
}

export async function renderFooter(args: RenderFooterArgs): Promise<Buffer> {
  return generateFooterOverlay({
    logoOption: args.logo,
    canvasWidth: T2_CANVAS_WIDTH,
  })
}
