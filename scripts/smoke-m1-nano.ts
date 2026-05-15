/**
 * Smoke local do pipeline M1 com nano-banana-2 (Step 2 novo).
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local scripts/smoke-m1-nano.ts \
 *     <path-ou-url-foto-referencia> [movel=sofa] [tipoCapa=estampada] [tipoFoto=capa] [set=1]
 *
 * Exemplos:
 *   tsx scripts/smoke-m1-nano.ts ~/Downloads/estampa.jpg
 *   tsx scripts/smoke-m1-nano.ts https://.../foto.png sofa estampada capa 1
 *
 * Pré-requisitos em .env.local:
 *   - FAL_KEY
 *   - BLOB_READ_WRITE_TOKEN
 *
 * Output: imprime URL do WEBP final no Vercel Blob.
 * Custo: ~$0.12/run (nano-banana 2K, single-step).
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { put } from '@vercel/blob'
import { renderPipelineAToUrl } from '@/lib/m1/render-pipeline-a'
import {
  M1_MOVEIS,
  M1_TIPOS_CAPA,
  M1_TIPOS_FOTO,
  type M1RenderInput,
} from '@/lib/m1/schema'

function parseEnum<T extends readonly string[]>(
  raw: string | undefined,
  allowed: T,
  fallback: T[number]
): T[number] {
  if (!raw) return fallback
  if (!allowed.includes(raw as T[number])) {
    throw new Error(`Valor inválido "${raw}". Esperado: ${allowed.join(' | ')}`)
  }
  return raw as T[number]
}

async function uploadReferenciaToBlob(absPath: string): Promise<string> {
  const buf = await readFile(absPath)
  const ext = path.extname(absPath).toLowerCase().replace('.', '') || 'png'
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
  const blob = await put(`smoke/referencia-${Date.now()}.${ext}`, buf, {
    access: 'public',
    addRandomSuffix: true,
    contentType: mime,
  })
  return blob.url
}

async function main() {
  const [, , refArg, movelArg, tipoCapaArg, tipoFotoArg, setArg] = process.argv

  if (!refArg) {
    console.error('Faltou path/URL da foto de referência.')
    console.error('Uso: tsx scripts/smoke-m1-nano.ts <path-ou-url> [movel] [tipoCapa] [tipoFoto] [set]')
    process.exit(1)
  }

  const isUrl = /^https?:\/\//i.test(refArg)
  const movel = parseEnum(movelArg, M1_MOVEIS, 'sofa')
  const tipoCapa = parseEnum(tipoCapaArg, M1_TIPOS_CAPA, 'estampada')
  const tipoFoto = parseEnum(tipoFotoArg, M1_TIPOS_FOTO, 'capa')
  const set = (setArg === '2' ? 2 : 1) as 1 | 2

  console.log('═════════ Smoke M1 (nano-banana-2) ═════════')
  console.log(`Referência: ${refArg}`)
  console.log(`Config:     ${movel} / ${tipoCapa} / ${tipoFoto} / set${set}`)
  console.log('────────────────────────────────────────────')

  let referenciaBlobUrl: string
  if (isUrl) {
    console.log('[1/3] Reutilizando URL pública existente.')
    referenciaBlobUrl = refArg
  } else {
    console.log('[1/3] Subindo referência ao Vercel Blob...')
    referenciaBlobUrl = await uploadReferenciaToBlob(path.resolve(refArg))
  }
  console.log(`      → ${referenciaBlobUrl}`)

  const input: M1RenderInput = {
    movel,
    tipoCapa,
    tipoFoto,
    set,
    referenciaBlobUrl,
  }

  console.log('[2/3] Rodando pipeline (nano-banana single-step)...')
  const t0 = Date.now()
  const finalUrl = await renderPipelineAToUrl(input)
  const took = Date.now() - t0
  console.log(`      → ${finalUrl}`)

  console.log('────────────────────────────────────────────')
  console.log(`[3/3] Concluído em ${took}ms`)
  console.log(`Output final: ${finalUrl}`)
  console.log('Custo estimado: ~$0.12 (nano-banana 2K)')
  console.log('════════════════════════════════════════════')
}

main().catch((err) => {
  console.error('FALHOU:', err)
  process.exit(1)
})
