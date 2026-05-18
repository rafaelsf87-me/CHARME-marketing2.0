/**
 * T2 Backgrounds — versão client-safe
 *
 * Estado: STUB (Fase 0).
 *
 * Padrão M3 (decoracoes-banco split): server carrega bytes via fs, client
 * só vê metadata necessário pra renderizar thumbnails na UI.
 *
 * Bundle client NÃO importa `fs`/`sharp`/`path`. Garantir via lint rule
 * em Fase 4 (next.config: bundle analyzer ou eslint custom).
 */

import type { BackgroundConfig } from '../types'

/**
 * Subset client-safe: omite caminhos absolutos de fs, mantém só o que o form
 * precisa (preview thumbnail + family). Em Fase 1 popular com pares ao
 * catalog.ts server.
 */
export interface BackgroundClientMeta {
  id: string
  publicPath: string
  family: string
  palette: BackgroundConfig['palette']
  contrast: BackgroundConfig['contrast']
}

export const T2_BACKGROUNDS_CLIENT: BackgroundClientMeta[] = []
