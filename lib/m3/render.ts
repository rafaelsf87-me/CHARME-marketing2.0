import { put } from '@vercel/blob'
import { generateTitulo } from './titulo'
import { generateAtriz } from './atriz'
import { callFluxDecoracao, callRembg } from './fal-client'
import { loadDecoracao } from './decoracoes-banco-server'
import { composeDesktop, composeMobile } from './post-process'
import { tituloCacheSize, getTituloCached, normalizeTituloKey } from './titulo-cache'

// Injeção de upload — default usa Vercel Blob. Smokes locais injetam stub que
// salva no FS local pra contornar [REF-M2-001] (token local = store privado).
export type UploadFn = (key: string, buffer: Buffer) => Promise<string>

const defaultUploadFn: UploadFn = async (key, buffer) => {
  const blob = await put(key, buffer, {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'image/webp',
  })
  return blob.url
}
import type {
  M3Cores,
  M3Condicao as M3CondicaoLayer,
  M3Decoracao,
  M3Layers,
} from './types'
import type { M3Input, M3Output, M3Condicao } from './schema'

// ─── Mapeamento condicões → ícones + textos ─────────────────────────────────

interface CondicaoConfig {
  iconeFile: string
  textos: string[]
}

const CONDICOES_CONFIG: Record<M3Condicao, CondicaoConfig> = {
  '12x-cartao': { iconeFile: 'cartao.png', textos: ['Pague em até', '12x no cartão'] },
  'frete-gratis': { iconeFile: 'presente.png', textos: ['FRETE', 'GRÁTIS*'] },
  cashback: { iconeFile: 'dinheiro.png', textos: ['CASHBACK', 'na próxima compra'] },
  'entrega-rapida': { iconeFile: 'foguete.png', textos: ['Entrega', 'RÁPIDA'] },
  'entrega-turbinada': { iconeFile: 'foguete.png', textos: ['Entrega', 'TURBINADA Liberada'] },
}

// Mapeia o ID da condição (M3Condicao enum) para o ID do banco curado.
const CONDICAO_ICONE_BANCO_ID: Record<M3Condicao, string> = {
  '12x-cartao': 'cartao',
  'frete-gratis': 'presente',
  cashback: 'dinheiro',
  'entrega-rapida': 'foguete',
  'entrega-turbinada': 'foguete',
}

// ─── Posições padrão das decorações (V1) ─────────────────────────────────────

// V1: posições fixas espalhadas no canvas (não-paramétrico). Future-proof:
// pode virar `distributeDecoracoes()` quando user escolher posicionamento.
const POSICOES_DESKTOP: Array<Omit<M3Decoracao, 'buffer'>> = [
  { x: 90, y: 120, w: 80, h: 80, layer: 'back' },
  { x: 600, y: 50, w: 60, h: 60, layer: 'back' },
  { x: 1500, y: 100, w: 70, h: 70, layer: 'back' },
  { x: 1430, y: 180, w: 90, h: 90, layer: 'front' },
  { x: 200, y: 380, w: 65, h: 65, layer: 'back' },
  { x: 720, y: 480, w: 55, h: 55, layer: 'back' },
  { x: 1390, y: 380, w: 70, h: 70, layer: 'front' },
  { x: 50, y: 480, w: 50, h: 50, layer: 'back' },
]

const POSICOES_MOBILE: Array<Omit<M3Decoracao, 'buffer'>> = [
  { x: 30, y: 110, w: 50, h: 50, layer: 'back' },
  { x: 350, y: 30, w: 45, h: 45, layer: 'back' },
  { x: 700, y: 30, w: 45, h: 45, layer: 'back' },
  { x: 720, y: 110, w: 55, h: 55, layer: 'front' },
  { x: 80, y: 250, w: 40, h: 40, layer: 'back' },
  { x: 470, y: 280, w: 45, h: 45, layer: 'front' },
  { x: 10, y: 350, w: 38, h: 38, layer: 'back' },
  { x: 740, y: 540, w: 40, h: 40, layer: 'front' },
]

function distributeDecoracoes(
  buffers: Buffer[],
  dimension: 'desktop' | 'mobile',
): M3Decoracao[] {
  const grid = dimension === 'desktop' ? POSICOES_DESKTOP : POSICOES_MOBILE
  return buffers.slice(0, grid.length).map((buf, idx) => ({
    buffer: buf,
    ...grid[idx],
  }))
}

// ─── Custo estimado ──────────────────────────────────────────────────────────

interface CustoBreakdown {
  titulo: number
  atriz: number
  decoracoes: number
  total: number
}

function calcularCusto(input: M3Input, tituloCacheHit: boolean, decoracoesIACount: number): CustoBreakdown {
  const titulo = tituloCacheHit ? 0 : 0.22
  const atriz = input.atriz.modo === 'ia' ? 0.07 : 0.005
  const decoracoes = decoracoesIACount * 0.05
  return { titulo, atriz, decoracoes, total: titulo + atriz + decoracoes }
}

// ─── Orquestrador renderM3 ───────────────────────────────────────────────────

export interface RenderM3Opts {
  uploadFn?: UploadFn
}

export async function renderM3(input: M3Input, opts: RenderM3Opts = {}): Promise<M3Output> {
  const uploadFn = opts.uploadFn ?? defaultUploadFn
  const t0 = Date.now()
  console.log(`[M3] renderM3 START · template=${input.template} · cache=${tituloCacheSize()} itens`)

  // Pré-checa se título já está cacheado pra calcular custo correto depois.
  const tituloKey = normalizeTituloKey(input.textos.nomePromocao)
  const tituloCacheHit = getTituloCached(tituloKey) !== undefined

  // a) Título + atriz em paralelo
  const atrizArgs =
    input.atriz.modo === 'ia'
      ? { modo: 'ia' as const, detalhes: input.atriz.detalhes }
      : { modo: 'upload' as const, uploadBuffer: Buffer.from(input.atriz.uploadBase64, 'base64') }

  const [tituloResult, atrizResult] = await Promise.all([
    generateTitulo({ texto: input.textos.nomePromocao }),
    generateAtriz(atrizArgs),
  ])
  console.log(
    `[M3] titulo=${tituloResult.cacheHit ? 'HIT' : 'miss'} · atriz=${atrizResult.source}`,
  )

  // b) Decorações — banco ou IA
  let decoracoesBuffers: Buffer[]
  let decoracoesIACount = 0
  if (input.decoracoes.modo === 'banco') {
    decoracoesBuffers = await Promise.all(input.decoracoes.ids.map((id) => loadDecoracao(id)))
  } else {
    decoracoesIACount = input.decoracoes.prompts.length
    decoracoesBuffers = await Promise.all(
      input.decoracoes.prompts.map(async (p) => {
        const raw = await callFluxDecoracao({ prompt: p })
        return callRembg(raw)
      }),
    )
  }

  // c) Ícones do card — sempre do banco (consistência visual)
  const iconesBuffers = await Promise.all(
    input.condicoes.map((c) => loadDecoracao(CONDICAO_ICONE_BANCO_ID[c])),
  )

  // d) Monta M3Condicao[] (layer)
  const condicoesLayer: M3CondicaoLayer[] = input.condicoes.map((id, idx) => ({
    id,
    iconePng: iconesBuffers[idx],
    textos: CONDICOES_CONFIG[id].textos,
  }))

  // e) Compose desktop + mobile em paralelo
  const cores: M3Cores = input.cores
  const layersDesktop: M3Layers = {
    bg: cores,
    textos: {
      descontoPromo: input.textos.descontoTexto,
      naLojaToda: input.textos.naLojaToda,
      footer:
        '*Frete grátis para Sul/Sudeste acima R$200, outras regiões acima R$299',
    },
    condicoes: condicoesLayer,
    tituloPng: tituloResult.png,
    atrizPng: atrizResult.png,
    decoracoesPngs: distributeDecoracoes(decoracoesBuffers, 'desktop'),
  }
  const layersMobile: M3Layers = {
    ...layersDesktop,
    decoracoesPngs: distributeDecoracoes(decoracoesBuffers, 'mobile'),
  }

  const [desktopBuf, mobileBuf] = await Promise.all([
    composeDesktop(layersDesktop),
    composeMobile(layersMobile),
  ])

  // f) Upload (paralelo) — usa uploadFn injetada ou Vercel Blob default
  const ts = Date.now()
  const [desktopUrl, mobileUrl] = await Promise.all([
    uploadFn(`m3-banners/${ts}-desktop.webp`, desktopBuf),
    uploadFn(`m3-banners/${ts}-mobile.webp`, mobileBuf),
  ])

  const custo = calcularCusto(input, tituloCacheHit, decoracoesIACount)
  const tookMs = Date.now() - t0
  console.log(
    `[M3] renderM3 OK em ${tookMs}ms · custo $${custo.total.toFixed(3)} ` +
      `(titulo=$${custo.titulo} atriz=$${custo.atriz} decor=$${custo.decoracoes})`,
  )

  return {
    desktopUrl,
    mobileUrl,
    generatedAt: new Date().toISOString(),
    custoEstimado: Number(custo.total.toFixed(4)),
  }
}
