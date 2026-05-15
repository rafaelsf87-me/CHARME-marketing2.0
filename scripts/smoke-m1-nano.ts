/**
 * Smoke local do pipeline M1 A2 com nano-banana-2.
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local scripts/smoke-m1-nano.ts \
 *     <foto-sofa> [foto-rolo|''] [movel=sofa] [tipoCapa=estampada] [tipoFoto=capa] [set=1]
 *
 * fotoSofa pode ser path local OU URL pública. Idem para fotoRolo.
 * Para rodar SEM foto-rolo, passe '' (string vazia) ou '-' na posição 2.
 *
 * Exemplos:
 *   tsx scripts/smoke-m1-nano.ts ~/Downloads/sofa-padrao.png
 *   tsx scripts/smoke-m1-nano.ts ~/Downloads/sofa-padrao.png ~/Downloads/rolo.jpg
 *   tsx scripts/smoke-m1-nano.ts ~/Downloads/sofa.png '' sofa estampada capa 1
 *
 * Pré-requisitos em .env.local:
 *   - FAL_KEY
 *
 * Output: grava PNG 1080×1080 em tmp/smoke/.
 * Custo: ~$0.12/run (nano-banana 2K, single-step).
 */

import { readFile, writeFile, mkdir, readdir, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fal } from '@fal-ai/client'
import { renderPipelineA } from '@/lib/m1/render-pipeline-a'
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

// Sobe via CDN público do fal.ai (mesma infra usada internamente pelo pipeline).
// Evita dependência do Vercel Blob no smoke local.
async function uploadLocalToFal(absPath: string): Promise<string> {
  const buf = await readFile(absPath)
  const ext = path.extname(absPath).toLowerCase().replace('.', '') || 'png'
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
  return fal.storage.upload(new Blob([new Uint8Array(buf)], { type: mime }))
}

// Aceita path local ou URL pública. Retorna URL sempre.
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

// Mantém só os N arquivos mais recentes em tmp/smoke/. Política compartilhada
// com smoke-m1-detalhe.ts pra evitar acúmulo após várias iterações.
async function pruneSmokeDir(outDir: string, keep = 4): Promise<void> {
  const names = await readdir(outDir).catch(() => [] as string[])
  if (names.length <= keep) return
  const files = await Promise.all(
    names.map(async (name) => {
      const full = path.join(outDir, name)
      const s = await stat(full)
      return { full, mtime: s.mtimeMs }
    })
  )
  files.sort((a, b) => b.mtime - a.mtime)
  const toDelete = files.slice(keep)
  await Promise.all(toDelete.map((f) => unlink(f.full)))
  console.log(`[cleanup] removidos ${toDelete.length} arquivo(s) antigo(s); mantidos ${keep}.`)
}

async function main() {
  const [, , sofaArg, roloArg, movelArg, tipoCapaArg, tipoFotoArg, setArg] = process.argv

  if (!sofaArg) {
    console.error('Faltou path/URL da foto do sofá-padrão.')
    console.error("Uso: tsx scripts/smoke-m1-nano.ts <foto-sofa> [foto-rolo|''] [movel] [tipoCapa] [tipoFoto] [set]")
    process.exit(1)
  }

  fal.config({ credentials: process.env.FAL_KEY })

  const movel = parseEnum(movelArg, M1_MOVEIS, 'sofa')
  const tipoCapa = parseEnum(tipoCapaArg, M1_TIPOS_CAPA, 'estampada')
  const tipoFoto = parseEnum(tipoFotoArg, M1_TIPOS_FOTO, 'capa')
  const set = (setArg === '2' ? 2 : 1) as 1 | 2

  console.log('═════════ Smoke M1 A2 (nano-banana-2) ═════════')
  console.log(`fotoSofa:  ${sofaArg}`)
  console.log(`fotoRolo:  ${isEmptySlot(roloArg) ? '— (não fornecida)' : roloArg}`)
  console.log(`Config:    ${movel} / ${tipoCapa} / ${tipoFoto} / set${set}`)
  console.log('───────────────────────────────────────────────')

  console.log('[1/3] Preparando referências...')
  const fotoSofa = await resolveToUrl(sofaArg, 'fotoSofa')
  console.log(`      → ${fotoSofa}`)
  let fotoRolo: string | undefined
  if (!isEmptySlot(roloArg)) {
    fotoRolo = await resolveToUrl(roloArg as string, 'fotoRolo')
    console.log(`      → ${fotoRolo}`)
  }

  const input: M1RenderInput = {
    movel,
    tipoCapa,
    tipoFoto,
    set,
    fotoSofa,
    fotoRolo,
  }

  console.log('[2/3] Rodando pipeline (nano-banana single-step)...')
  const t0 = Date.now()
  const result = await renderPipelineA(input, { returnBufferOnly: true })
  const took = Date.now() - t0
  if (result.kind !== 'buffer') throw new Error('Esperava buffer do pipeline')

  const outDir = path.resolve(process.cwd(), 'tmp', 'smoke')
  await mkdir(outDir, { recursive: true })
  const tag = fotoRolo ? 'com-rolo' : 'sem-rolo'
  const outPath = path.join(
    outDir,
    `m1-${Date.now()}-${movel}-${tipoCapa}-${tipoFoto}-set${set}-${tag}.png`
  )
  await writeFile(outPath, result.buffer)

  await pruneSmokeDir(outDir)

  console.log('───────────────────────────────────────────────')
  console.log(`[3/3] Concluído em ${took}ms`)
  console.log(`Output local: ${outPath}`)
  console.log('Custo estimado: ~$0.12 (nano-banana 2K)')
  console.log('═══════════════════════════════════════════════')
}

main().catch((err) => {
  console.error('FALHOU:', err)
  process.exit(1)
})
