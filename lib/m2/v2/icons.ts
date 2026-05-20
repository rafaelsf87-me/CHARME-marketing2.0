/**
 * V2 Icons Registry
 *
 * 12 ícones genéricos com descrição semântica usada no prompt LLM
 * (mapping keyword → icon é decidido pelo LLM, sem keywords explícitas
 * — Rafael decisão executiva 19/05/2026).
 *
 * Estilo unificado: stroke ciano #4CDDC3 2px, círculo 80×80, viewBox 0 0 80 80.
 * Servidos via /public/brand/icons-v2/icon-{id}.svg (Satori precisa URL absoluta).
 */

import type { V2IconId } from './types'

export interface V2IconMeta {
  id: V2IconId
  arquivo: string
  semantica: string
}

export const V2_ICONS_REGISTRY: Record<V2IconId, V2IconMeta> = {
  'casa-coracao': {
    id: 'casa-coracao',
    arquivo: 'icon-casa-coracao.svg',
    semantica: 'identidade brand Charme do Detalhe, lar, casa, aconchego',
  },
  sparkle: {
    id: 'sparkle',
    arquivo: 'icon-sparkle.svg',
    semantica: 'destaque, "uau", novidade, brilho, mágico',
  },
  estrela: {
    id: 'estrela',
    arquivo: 'icon-estrela.svg',
    semantica: 'qualidade, avaliação 5 estrelas, premium, top',
  },
  check: {
    id: 'check',
    arquivo: 'icon-check.svg',
    semantica: 'validação, correto, "sim faça", aprovado',
  },
  coracao: {
    id: 'coracao',
    arquivo: 'icon-coracao.svg',
    semantica: 'cuidado, afeto, recomendação, amor',
  },
  cifrao: {
    id: 'cifrao',
    arquivo: 'icon-cifrao.svg',
    semantica: 'preço, economia, custo-benefício, valor',
  },
  etiqueta: {
    id: 'etiqueta',
    arquivo: 'icon-etiqueta.svg',
    semantica: 'oferta, promoção, desconto, tag',
  },
  escudo: {
    id: 'escudo',
    arquivo: 'icon-escudo.svg',
    semantica: 'proteção, garantia, durabilidade, segurança',
  },
  relogio: {
    id: 'relogio',
    arquivo: 'icon-relogio.svg',
    semantica: 'tempo, prazo, rápido, agilidade',
  },
  raio: {
    id: 'raio',
    arquivo: 'icon-raio.svg',
    semantica: 'energia, instantâneo, ação, poder',
  },
  lampada: {
    id: 'lampada',
    arquivo: 'icon-lampada.svg',
    semantica: 'dica, ideia, novidade educativa, insight',
  },
  'x-circulo': {
    id: 'x-circulo',
    arquivo: 'icon-x-circulo.svg',
    semantica: 'erro, incorreto, "não faça", evitar',
  },
}

/** URL pública absoluta do ícone (uso em Satori via HTTP — só funciona com server up). */
export function getIconUrl(id: V2IconId, origin: string): string {
  return `${origin}/brand/icons-v2/${V2_ICONS_REGISTRY[id].arquivo}`
}

/** URL pública do conector (uso em Satori via HTTP). */
export type V2ConnectorId = 'curve-tl' | 'curve-tr' | 'curve-bl' | 'curve-br' | 'dotted-vertical'

export function getConnectorUrl(id: V2ConnectorId, origin: string): string {
  return `${origin}/brand/connectors-v2/connector-${id}.svg`
}

// ─── Data URL loaders (uso em scripts/dev offline) ──────────────────────────

import fs from 'node:fs/promises'
import path from 'node:path'

const ICON_DIR = path.join(process.cwd(), 'public', 'brand', 'icons-v2')
const CONNECTOR_DIR = path.join(process.cwd(), 'public', 'brand', 'connectors-v2')

/** Lê SVG do disco e retorna como data URL base64. Cache em memória. */
const dataUrlCache = new Map<string, string>()

async function loadAsDataUrl(filePath: string, key: string): Promise<string> {
  const cached = dataUrlCache.get(key)
  if (cached) return cached
  const raw = await fs.readFile(filePath)
  const b64 = raw.toString('base64')
  const dataUrl = `data:image/svg+xml;base64,${b64}`
  dataUrlCache.set(key, dataUrl)
  return dataUrl
}

export async function loadIconDataUrl(id: V2IconId): Promise<string> {
  return loadAsDataUrl(path.join(ICON_DIR, V2_ICONS_REGISTRY[id].arquivo), `icon:${id}`)
}

export async function loadConnectorDataUrl(id: V2ConnectorId): Promise<string> {
  return loadAsDataUrl(
    path.join(CONNECTOR_DIR, `connector-${id}.svg`),
    `connector:${id}`,
  )
}

/** Pré-carrega TODOS ícones + conectores (uso em compose.ts antes do Satori). */
export async function loadAllAssetUrls(): Promise<{
  icons: Record<V2IconId, string>
  connectors: Record<V2ConnectorId, string>
}> {
  const iconIds = Object.keys(V2_ICONS_REGISTRY) as V2IconId[]
  const connectorIds: V2ConnectorId[] = [
    'curve-tl',
    'curve-tr',
    'curve-bl',
    'curve-br',
    'dotted-vertical',
  ]
  const icons = {} as Record<V2IconId, string>
  const connectors = {} as Record<V2ConnectorId, string>
  await Promise.all([
    ...iconIds.map(async (id) => {
      icons[id] = await loadIconDataUrl(id)
    }),
    ...connectorIds.map(async (id) => {
      connectors[id] = await loadConnectorDataUrl(id)
    }),
  ])
  return { icons, connectors }
}

export type V2AssetUrls = Awaited<ReturnType<typeof loadAllAssetUrls>>

/** Bloco de texto a ser injetado no prompt LLM (descrição semântica dos ícones). */
export function iconsSemanticBlockForLLM(): string {
  const lines = Object.values(V2_ICONS_REGISTRY).map(
    (icon) => `- "${icon.id}": ${icon.semantica}`,
  )
  return lines.join('\n')
}
