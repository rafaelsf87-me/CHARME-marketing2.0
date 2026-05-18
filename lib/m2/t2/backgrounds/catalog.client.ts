/**
 * T2 Backgrounds — versão client-safe
 *
 * Mirror serializável de catalog.ts. Sem imports de `fs`/`sharp`/`path`.
 * Form do client usa pra exibir thumbnails + family info.
 */

import type { BackgroundConfig, T2AllowedFormat } from '../types'
import { T2_BACKGROUNDS } from './catalog'

export interface BackgroundClientMeta {
  id: string
  publicPath: string
  family: string
  palette: BackgroundConfig['palette']
  contrast: BackgroundConfig['contrast']
  allowedFormats: T2AllowedFormat[]
}

export const T2_BACKGROUNDS_CLIENT: BackgroundClientMeta[] = T2_BACKGROUNDS.map((b) => ({
  id: b.id,
  publicPath: b.file,
  family: b.family,
  palette: b.palette,
  contrast: b.contrast,
  allowedFormats: b.allowedFormats,
}))
