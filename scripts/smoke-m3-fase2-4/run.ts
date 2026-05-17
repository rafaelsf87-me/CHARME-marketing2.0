/**
 * Smoke M3 Sub-Fase 2.4 — renderM3() end-to-end com uploadFn local.
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local scripts/smoke-m3-fase2-4/run.ts
 *
 * Pré-requisitos em .env.local:
 *   - FAL_KEY
 *
 * Pipeline completo: schema validation → titulo (cache pré-hidratado) +
 * atriz (Flux+rembg) paralelo → loadDecoracao banco → composeDesktop +
 * composeMobile paralelo → uploadFn local (FS) → M3Output.
 *
 * Contornos:
 * - [REF-M2-001] Store Blob privado → injetamos uploadFn que salva no FS.
 * - Cache do título zera todo run (Map in-memory) → pré-hidratamos com o PNG
 *   do smoke fase 1 pra economizar $0.22 da regeneração.
 *
 * Custo esperado: ~$0.07 (atriz Flux + rembg; título cache hit; decor banco).
 *
 * IMPORTANTE: rodar apenas com autorização explícita do Rafael (custo real $).
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { renderM3, type UploadFn } from '@/lib/m3/render'
import { M3InputSchema, M3OutputSchema, type M3Input } from '@/lib/m3/schema'
import { setTituloCached, tituloCacheSize } from '@/lib/m3/titulo-cache'
import { brandM3 } from '@/lib/brand/m3.brand'

const ROOT = process.cwd()
const OUT_DIR = path.resolve(ROOT, 'scripts/smoke-m3-fase2-4/output')

// uploadFn stub: salva o Buffer em scripts/smoke-m3-fase2-4/output/uploaded-<key>
// (key vem como "m3-banners/<ts>-desktop.webp" → flatten pra single dir).
const localUpload: UploadFn = async (key, buf) => {
  const safeName = key.replace(/[\\/]/g, '_')
  const fullPath = path.join(OUT_DIR, `uploaded-${safeName}`)
  await writeFile(fullPath, buf)
  return `file://${fullPath}`
}

async function main() {
  console.log('═════════ Smoke M3 Sub-Fase 2.4 — renderM3() end-to-end ═════════')
  console.log('Pipeline: schema → titulo (cache HIT pré-hidratado) + atriz (paralelo) → decor banco → compose × 2 → upload local × 2')
  console.log('Custo estimado: ~$0.07 (atriz Flux + rembg)')
  console.log('──────────────────────────────────────────────────────────────────')

  if (!process.env.FAL_KEY) throw new Error('FAL_KEY ausente em .env.local')

  // a) Pré-hidrata cache do título pra evitar $0.22 da regeneração.
  const tituloLocalPath = 'scripts/smoke-m3-fase1/output/teste-1.png'
  const tituloLocal = await readFile(path.resolve(ROOT, tituloLocalPath))
  setTituloCached('DESCONTÃO DE MÃE', tituloLocal)
  console.log(`[cache] título pré-hidratado · ${(tituloLocal.length / 1024).toFixed(1)} KB · cache=${tituloCacheSize()} item(s)`)

  // b) Input mockado simulando UI.
  const rawInput = {
    template: 'atual-maio26',
    textos: {
      nomePromocao: 'DESCONTÃO DE MÃE',
      descontoTexto: '38% OFF',
      naLojaToda: true,
    },
    cores: {
      primary: brandM3.defaultColors.primary,
      secondary: brandM3.defaultColors.secondary,
      accent: brandM3.defaultColors.accent,
      cardBg: brandM3.defaultColors.cardBg,
      cardBgEnd: brandM3.defaultColors.cardBgEnd,
    },
    condicoes: ['entrega-turbinada', 'frete-gratis', '12x-cartao', 'cashback'],
    atriz: { modo: 'ia' as const },
    decoracoes: {
      modo: 'banco' as const,
      ids: ['coracao-rosa', 'coracao-batendo', 'coracao-decoracao', 'coracao-rosa'],
    },
  }

  const parsedInput = M3InputSchema.safeParse(rawInput)
  if (!parsedInput.success) {
    console.error('[FAIL] Input inválido:', parsedInput.error.flatten())
    process.exit(1)
  }
  const input: M3Input = parsedInput.data
  console.log(`[input] válido · ${input.condicoes.length} condições · atriz=${input.atriz.modo} · decor=${input.decoracoes.modo}`)

  // c) Executa pipeline com uploadFn local.
  const t0 = Date.now()
  const result = await renderM3(input, { uploadFn: localUpload })
  const tookMs = Date.now() - t0

  // d) Valida output.
  const parsedOutput = M3OutputSchema.safeParse(result)
  if (!parsedOutput.success) {
    console.error('[FAIL] Output inválido:', parsedOutput.error.flatten())
    process.exit(1)
  }
  console.log(`\n[output] schema OK`)
  console.log(`  desktopUrl:    ${result.desktopUrl}`)
  console.log(`  mobileUrl:     ${result.mobileUrl}`)
  console.log(`  generatedAt:   ${result.generatedAt}`)
  console.log(`  custoEstimado: $${result.custoEstimado}`)
  console.log(`  tempo total:   ${tookMs}ms`)

  // e) Lê arquivos físicos via path local (extrai de file://...).
  console.log('\n[verify] validando arquivos físicos no FS...')
  const desktopPath = result.desktopUrl.replace(/^file:\/\//, '')
  const mobilePath = result.mobileUrl.replace(/^file:\/\//, '')

  const [desktopBuf, mobileBuf] = await Promise.all([readFile(desktopPath), readFile(mobilePath)])
  const [desktopMeta, mobileMeta] = await Promise.all([
    sharp(desktopBuf).metadata(),
    sharp(mobileBuf).metadata(),
  ])

  console.log(`  desktop: ${(desktopBuf.length / 1024).toFixed(1)} KB · ${desktopMeta.width}x${desktopMeta.height} ${desktopMeta.format}`)
  console.log(`  mobile:  ${(mobileBuf.length / 1024).toFixed(1)} KB · ${mobileMeta.width}x${mobileMeta.height} ${mobileMeta.format}`)

  if (desktopMeta.width !== 1920 || desktopMeta.height !== 550 || desktopMeta.format !== 'webp') {
    throw new Error(`Desktop dimensões inválidas: ${desktopMeta.width}x${desktopMeta.height} ${desktopMeta.format}`)
  }
  if (mobileMeta.width !== 800 || mobileMeta.height !== 600 || mobileMeta.format !== 'webp') {
    throw new Error(`Mobile dimensões inválidas: ${mobileMeta.width}x${mobileMeta.height} ${mobileMeta.format}`)
  }

  // Cria cópias com nomes fixos pra facilitar preview HTML (sem timestamp).
  await writeFile(path.join(OUT_DIR, 'banner-desktop.webp'), desktopBuf)
  await writeFile(path.join(OUT_DIR, 'banner-mobile.webp'), mobileBuf)

  console.log('\n═════════ RESUMO ═════════')
  console.log(`Pipeline OK em ${tookMs}ms`)
  console.log(`Custo real (estimado): $${result.custoEstimado}`)
  console.log(`Desktop local: ${desktopPath}`)
  console.log(`Mobile local:  ${mobilePath}`)
  console.log(`Aliases p/ preview: ${path.join(OUT_DIR, 'banner-desktop.webp')}`)
  console.log(`                    ${path.join(OUT_DIR, 'banner-mobile.webp')}`)
  console.log('Schemas validados: M3InputSchema ✓ · M3OutputSchema ✓')
  console.log('═══════════════════════════════════════════════════════════════════')
}

main().catch((err) => {
  console.error('FALHOU:', err)
  process.exit(1)
})
