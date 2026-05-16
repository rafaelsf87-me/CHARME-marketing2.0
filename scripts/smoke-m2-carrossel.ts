/**
 * Smoke local M2 — Carrossel 3 slides (Template 1 · Atual_Maio26).
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local scripts/smoke-m2-carrossel.ts
 *
 * Pré-requisitos em .env.local:
 *   - FAL_KEY
 *   - BLOB_READ_WRITE_TOKEN
 *
 * Output: 3 PNGs 1080×1350 em tmp/smoke-m2-carrossel/. Política keep-4-recentes.
 * Custo: ~$0.57 (3 × $0.19, gpt-image-1 high, 1024×1536). Decisão DEC-M2-001 (Adendo §5).
 *
 * IMPORTANTE: rodar apenas com autorização explícita do Rafael (custo real $).
 */

import { writeFile, mkdir, readdir, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { renderM2 } from '@/lib/m2/render'
import type { M2GenerateInput } from '@/lib/m2/schema'

const CARROSSEL_EXEMPLO: M2GenerateInput = {
  modo: 'carrossel',
  templateId: 'atual-maio26',
  logo: 'casinha',
  modoGeracao: 'ia',
  contextoGeral:
    'Carrossel educativo sobre capas elásticas — tom acolhedor, foco em transformação visual da casa.',
  slides: [
    {
      copyTexto:
        'Slide 1 — TÍTULO: Cansada do sofá com cara de gasto? Texto de apoio: 3 jeitos rápidos de renovar a sala em menos de 30 minutos.',
    },
    {
      copyTexto:
        'Slide 2 — TÍTULO: Capa elástica veste qualquer sofá. Texto de apoio: Encaixa em sofás de 2 e 3 lugares sem precisar tirar nada. 5 minutos por sofá.',
    },
    {
      copyTexto:
        'Slide 3 — TÍTULO: Mais de 50 estampas e cores. Texto de apoio: Do liso minimalista ao boho colorido — tem opção pra cada estilo de casa.',
    },
  ],
  ctaFinal: 'Salva o post pra escolher a sua e arrasta pro carrinho lá no perfil!',
}

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

async function downloadToFile(url: string, outPath: string): Promise<void> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Falha ao baixar ${url} (${resp.status})`)
  await writeFile(outPath, Buffer.from(await resp.arrayBuffer()))
}

async function main() {
  console.log('═════════ Smoke M2 — Carrossel 3 slides (T1) ═════════')
  console.log('Template: atual-maio26 · gpt-image-1 high · 1024x1536 → 1080×1350 + footer composite')
  console.log('Logo: casinha · Modo: ia')
  console.log('Custo estimado: ~$0.57 (3 × $0.19)')
  console.log('─────────────────────────────────────────────────────')

  if (!process.env.FAL_KEY) throw new Error('FAL_KEY ausente em .env.local')
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN ausente em .env.local')
  }

  const t0 = Date.now()
  const { urls } = await renderM2(CARROSSEL_EXEMPLO)
  const took = Date.now() - t0
  if (urls.length !== 3) throw new Error(`Esperava 3 URLs, recebi ${urls.length}`)

  console.log(`[FAL+Blob] ${took}ms (paralelo) → 3 slides`)
  urls.forEach((u, i) => console.log(`  slide ${i + 1}: ${u}`))

  const outDir = path.resolve(process.cwd(), 'tmp', 'smoke-m2-carrossel')
  await mkdir(outDir, { recursive: true })
  const stamp = Date.now()
  await Promise.all(
    urls.map((u, i) => downloadToFile(u, path.join(outDir, `m2-carrossel-${stamp}-slide-${i + 1}.png`)))
  )
  await pruneSmokeDir(outDir)

  console.log('─────────────────────────────────────────────────────')
  console.log(`Outputs locais: ${outDir}/m2-carrossel-${stamp}-slide-{1,2,3}.png`)
  console.log('═════════════════════════════════════════════════════')
}

main().catch((err) => {
  console.error('FALHOU:', err)
  process.exit(1)
})
