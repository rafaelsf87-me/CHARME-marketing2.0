/**
 * Smoke local M2 — Imagem Única (Template 1 · Atual_Maio26).
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local scripts/smoke-m2-imagem-unica.ts
 *
 * Pré-requisitos em .env.local:
 *   - FAL_KEY
 *   - BLOB_READ_WRITE_TOKEN (renderM2 sobe o PNG pós-resize no Vercel Blob)
 *
 * Output: PNG 1080×1350 em tmp/smoke-m2-imagem-unica/. Política keep-4-recentes.
 * Custo: ~$0.19 (gpt-image-1 high, 1024×1536). Decisão DEC-M2-001 (Adendo §5).
 *
 * IMPORTANTE: rodar apenas com autorização explícita do Rafael (custo real $).
 */

import { writeFile, mkdir, readdir, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { renderM2 } from '@/lib/m2/render'
import type { M2GenerateInput } from '@/lib/m2/schema'

// Copy reestruturado pós-smoke 2: removido "da Charme do Detalhe" (redundante
// com footer) e adicionadas quebras de linha pra ajudar o modelo a separar
// título dos bullets na hierarquia visual.
const COPY_EXEMPLO = `3 motivos pra você escolher uma capa elástica:

1) Veste o sofá inteiro em 5 minutos sem precisar tirar nada.
2) Tecido elástico que se molda ao formato do seu móvel.
3) Lavável na máquina e seca rápido.`

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
  console.log('═════════ Smoke M2 — Imagem Única (T1) ═════════')
  console.log('Template: atual-maio26 · gpt-image-1 high · 1024x1536 → 1080×1350 + footer composite')
  console.log('Logo: casinha · Modo: ia')
  console.log('Custo estimado: ~$0.19')
  console.log('───────────────────────────────────────────────')

  if (!process.env.FAL_KEY) {
    throw new Error('FAL_KEY ausente em .env.local')
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN ausente em .env.local (renderM2 sobe no Blob)')
  }

  const input: M2GenerateInput = {
    modo: 'imagem-unica',
    templateId: 'atual-maio26',
    logo: 'casinha',
    modoGeracao: 'ia',
    copyTexto: COPY_EXEMPLO,
  }

  const t0 = Date.now()
  const { urls } = await renderM2(input)
  const took = Date.now() - t0
  if (urls.length !== 1) throw new Error(`Esperava 1 URL, recebi ${urls.length}`)

  const blobUrl = urls[0]
  console.log(`[FAL+Blob] ${took}ms → ${blobUrl}`)

  // Baixa o resultado pra inspeção local.
  const outDir = path.resolve(process.cwd(), 'tmp', 'smoke-m2-imagem-unica')
  await mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, `m2-imagem-${Date.now()}.png`)
  const resp = await fetch(blobUrl)
  if (!resp.ok) throw new Error(`Falha ao baixar do Blob (${resp.status})`)
  await writeFile(outPath, Buffer.from(await resp.arrayBuffer()))
  await pruneSmokeDir(outDir)

  console.log('───────────────────────────────────────────────')
  console.log(`Output local: ${outPath}`)
  console.log(`Blob URL:     ${blobUrl}`)
  console.log('═══════════════════════════════════════════════')
}

main().catch((err) => {
  console.error('FALHOU:', err)
  process.exit(1)
})
