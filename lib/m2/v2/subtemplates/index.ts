/**
 * V2 Subtemplates — barrel + dispatcher
 */

export { renderCapaCurta } from './capa-curta'
export { renderCapaLonga } from './capa-longa'
export { renderCtaFinal } from './cta-final'

import { renderCapaCurta } from './capa-curta'
import { renderCapaLonga } from './capa-longa'
import { renderCtaFinal } from './cta-final'
import type { V2AssetUrls } from '../icons'
import type { V2Plan } from '../types'
import * as React from 'react'

export interface DispatchRenderArgs {
  plan: V2Plan
  assets: V2AssetUrls
  /** Necessário só pra cta-final. */
  footerLogoUrl?: string
  /** Necessário só pra cta-final. */
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
      footerLogoUrl: args.footerLogoUrl,
      footerHandle: args.footerHandle,
    })
  }
  if (args.plan.variant === 'capa-longa') {
    return renderCapaLonga({ plan: args.plan, assets: args.assets })
  }
  return renderCapaCurta({ plan: args.plan, assets: args.assets })
}
