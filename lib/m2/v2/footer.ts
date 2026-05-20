/**
 * V2 Footer — helper de config + data URL loader
 *
 * Invariante: footer só no slide cta-final.
 * V2.0: footer renderizado inline via Satori (sem PNG embutido).
 *
 * Logo carregado como data URL base64 pra funcionar offline (scripts) E online.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { brandM2 } from '@/lib/brand/m2.brand'
import type { M2LogoOption } from '../schema'

export interface V2FooterConfig {
  logoUrl: string
  handle: string
}

const LOGO_DIR = path.join(process.cwd(), 'public', 'brand', 'm2', 'logos')
const dataUrlCache = new Map<M2LogoOption, string>()

export async function loadFooterLogoDataUrl(logo: M2LogoOption): Promise<string> {
  const cached = dataUrlCache.get(logo)
  if (cached) return cached
  const file = brandM2.logos.files[logo]
  const raw = await fs.readFile(path.join(LOGO_DIR, file))
  const b64 = raw.toString('base64')
  const dataUrl = `data:image/png;base64,${b64}`
  dataUrlCache.set(logo, dataUrl)
  return dataUrl
}

export async function buildFooterConfig(logo: M2LogoOption): Promise<V2FooterConfig> {
  return {
    logoUrl: await loadFooterLogoDataUrl(logo),
    handle: brandM2.footer.handle,
  }
}
