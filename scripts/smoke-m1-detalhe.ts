/**
 * Smoke local Detalhe Tecido SOFÁ (split close+zoom).
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local scripts/smoke-m1-detalhe.ts \
 *     <foto-sofa> [foto-rolo|''] [tipoCapa=estampada]
 *
 * Roda renderPipelineA 2× (close + zoom) com overrideTemplate, salva cada
 * metade como PNG 1080×1080 separado em tmp/smoke/ e compõe lado a lado
 * (540×1080 cada metade → 1080×1080) replicando renderPipelineDetalhe.
 *
 * Saídas:
 *   tmp/smoke/m1-detalhe-<ts>-close.png   (1080×1080)
 *   tmp/smoke/m1-detalhe-<ts>-zoom.png    (1080×1080)
 *   tmp/smoke/m1-detalhe-<ts>-split.png   (1080×1080 composto)
 *
 * Custo: ~$0.24/run (nano-banana 2K × 2 calls).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { fal } from '@fal-ai/client'
import { renderPipelineA } from '@/lib/m1/render-pipeline-a'
import { getTemplate } from '@/lib/m1/templates'
import { brandM1 } from '@/lib/brand/m1.brand'
import {
  M1_TIPOS_CAPA,
  type M1RenderInput,
  type M1TipoCapa,
} from '@/lib/m1/schema'

async function uploadLocalToFal(absPath: string): Promise<string> {
  const buf = await readFile(absPath)
  const ext = path.extname(absPath).toLowerCase().replace('.', '') || 'png'
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
  return fal.storage.upload(new Blob([new Uint8Array(buf)], { type: mime }))
}

async function resolveToUrl(arg: string, label: string): Promise<string> {
  if (/^https?:\/\//i.test(arg)) {
    console.log(`      ${label}: reaproveitando URL pública.`)
    return arg
  }
  console.log(`      ${label}: subindo ao fal.storage...`)
  return uploadLocalToFal(path.resolve(arg))
}

function isEmptySlot(arg: string | undefined): boolean {
  return !arg || arg === '' || arg === '-'
}

async function cropCenter(
  buffer: Buffer,
  target: { width: number; height: number },
  source: { width: number; height: number }
): Promise<Buffer> {
  const left = Math.max(0, Math.floor((source.width - target.width) / 2))
  const top = Math.max(0, Math.floor((source.height - target.height) / 2))
  return sharp(buffer)
    .extract({ left, top, width: target.width, height: target.height })
    .toBuffer()
}

async function main() {
  const [, , sofaArg, roloArg, tipoCapaArg] = process.argv
  if (!sofaArg) {
    console.error('Faltou path/URL da foto do sofá-padrão.')
    process.exit(1)
  }

  fal.config({ credentials: process.env.FAL_KEY })

  const tipoCapa: M1TipoCapa = M1_TIPOS_CAPA.includes(
    tipoCapaArg as M1TipoCapa
  )
    ? (tipoCapaArg as M1TipoCapa)
    : 'estampada'

  console.log('═════════ Smoke M1 Detalhe Tecido (split) ═════════')
  console.log(`fotoSofa:  ${sofaArg}`)
  console.log(`fotoRolo:  ${isEmptySlot(roloArg) ? '— (não fornecida)' : roloArg}`)
  console.log(`tipoCapa:  ${tipoCapa}`)
  console.log('───────────────────────────────────────────────────')

  console.log('[1/4] Preparando referências...')
  const fotoSofa = await resolveToUrl(sofaArg, 'fotoSofa')
  console.log(`      → ${fotoSofa}`)
  let fotoRolo: string | undefined
  if (!isEmptySlot(roloArg)) {
    fotoRolo = await resolveToUrl(roloArg as string, 'fotoRolo')
    console.log(`      → ${fotoRolo}`)
  }

  const template = getTemplate('sofa', 'detalhe-tecido', 1)
  if (template.variant !== 'split') {
    throw new Error(`Esperava template split, recebi ${template.variant}`)
  }

  const input: M1RenderInput = {
    movel: 'sofa',
    tipoCapa,
    tipoFoto: 'detalhe-tecido',
    set: 1,
    fotoSofa,
    fotoRolo,
  }

  console.log('[2/4] Rodando close + zoom em paralelo (nano-banana ×2)...')
  const t0 = Date.now()
  const [closeResult, zoomResult] = await Promise.all([
    renderPipelineA(input, {
      overrideTemplate: { imagePath: template.imageClosePath },
      detalheVariant: 'close',
      returnBufferOnly: true,
    }),
    renderPipelineA(input, {
      overrideTemplate: { imagePath: template.imageZoomPath },
      detalheVariant: 'zoom',
      returnBufferOnly: true,
    }),
  ])
  const took = Date.now() - t0
  if (closeResult.kind !== 'buffer' || zoomResult.kind !== 'buffer') {
    throw new Error('Esperava buffers das duas metades')
  }

  const halfDims = brandM1.dimensions.detalheHalf
  const fullDims = brandM1.dimensions.final

  console.log('[3/4] Compondo split 540×1080 + 540×1080 = 1080×1080...')
  const closeHalf = await cropCenter(closeResult.buffer, halfDims, fullDims)
  const zoomHalf = await cropCenter(zoomResult.buffer, halfDims, fullDims)
  const composite = await sharp({
    create: {
      width: fullDims.width,
      height: fullDims.height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite([
      { input: closeHalf, left: 0, top: 0 },
      { input: zoomHalf, left: halfDims.width, top: 0 },
    ])
    .png()
    .toBuffer()

  const outDir = path.resolve(process.cwd(), 'tmp', 'smoke')
  await mkdir(outDir, { recursive: true })
  const ts = Date.now()
  const closePath = path.join(outDir, `m1-detalhe-${ts}-close.png`)
  const zoomPath = path.join(outDir, `m1-detalhe-${ts}-zoom.png`)
  const splitPath = path.join(outDir, `m1-detalhe-${ts}-split.png`)
  await writeFile(closePath, closeResult.buffer)
  await writeFile(zoomPath, zoomResult.buffer)
  await writeFile(splitPath, composite)

  console.log('───────────────────────────────────────────────────')
  console.log(`[4/4] Concluído em ${took}ms`)
  console.log(`Close:    ${closePath}`)
  console.log(`Zoom:     ${zoomPath}`)
  console.log(`Split:    ${splitPath}`)
  console.log('Custo estimado: ~$0.24 (nano-banana 2K ×2)')
  console.log('═══════════════════════════════════════════════════')
}

main().catch((err) => {
  console.error('FALHOU:', err)
  process.exit(1)
})
