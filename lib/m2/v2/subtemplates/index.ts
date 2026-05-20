/**
 * V2 Subtemplates — barrel + dispatcher (V2.0.1)
 *
 * Dispatcher recebe `zone` (ZoneSpec) e injeta nos subtemplates pra que
 * conectores apontem pra pontos âncora corretos do hero (BUG-V2-003).
 */

export { renderCapaCurta } from './capa-curta'
export { renderCapaLonga } from './capa-longa'
export { renderCtaFinal } from './cta-final'

import { renderCapaCurta } from './capa-curta'
import { renderCapaLonga } from './capa-longa'
import { renderCtaFinal } from './cta-final'
import type { V2AssetUrls } from '../icons'
import type { V2Plan } from '../types'
import type { ZoneSpec } from '../zones'
import * as React from 'react'

export interface DispatchRenderArgs {
  plan: V2Plan
  assets: V2AssetUrls
  zone: ZoneSpec
  footerLogoUrl?: string
  footerHandle?: string
}

export function dispatchSubtemplate(args: DispatchRenderArgs): React.ReactElement {
  if (args.plan.templateType === 'cta-final') {
    if (!args.footerLogoUrl || !args.footerHandle) {
      throw new Error('[V2] dispatchSubtemplate: cta-final exige footerLogoUrl + footerHandle')
    }
    return renderCtaFinal({
      plan: args.plan,
      assets: args.assets,
      zone: args.zone,
      footerLogoUrl: args.footerLogoUrl,
      footerHandle: args.footerHandle,
    })
  }
  if (args.plan.variant === 'capa-longa') {
    return renderCapaLonga({ plan: args.plan, assets: args.assets, zone: args.zone })
  }
  return renderCapaCurta({ plan: args.plan, assets: args.assets, zone: args.zone })
}
