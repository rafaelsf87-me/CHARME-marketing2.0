/**
 * Smoke M3 Sub-Fase 2.2 — composeDesktop + composeMobile (Sharp + Satori).
 *
 * Uso:
 *   pnpm tsx --env-file=.env.local scripts/smoke-m3-fase2-2/run.ts
 *
 * Zero custo de IA — reusa PNGs locais dos smokes anteriores:
 *   - tituloPng: scripts/smoke-m3-fase1/output/teste-1.png (DESCONTÃO DE MÃE)
 *   - atrizPng:  scripts/smoke-m3-fase2-1/output/atriz-1.png
 *   - ícones do card + decorações: public/brand/m3/decoracoes/*.png
 *
 * Output: 2 WEBPs em scripts/smoke-m3-fase2-2/output/
 *   - banner-desktop.webp (1920×550)
 *   - banner-mobile.webp  (800×600)
 *
 * Validação: dimensões via Sharp metadata + filesize sanity check.
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { composeDesktop, composeMobile } from '@/lib/m3/post-process'
import { brandM3 } from '@/lib/brand/m3.brand'
import type { M3Layers } from '@/lib/m3/types'

const ROOT = process.cwd()

async function read(p: string): Promise<Buffer> {
  return readFile(path.resolve(ROOT, p))
}

async function buildLayers(): Promise<M3Layers> {
  // PNGs IA reaproveitados
  const tituloPng = await read('scripts/smoke-m3-fase1/output/teste-1.png')
  const atrizPng = await read('scripts/smoke-m3-fase2-1/output/atriz-1.png')

  // Ícones do card (4 condições — ordem TL TR BL BR)
  const decorDir = 'public/brand/m3/decoracoes'
  const [foguete, presente, cartao, dinheiro] = await Promise.all([
    read(`${decorDir}/foguete.png`),
    read(`${decorDir}/presente.png`),
    read(`${decorDir}/cartao.png`),
    read(`${decorDir}/dinheiro.png`),
  ])

  // Decorações de fundo + frente
  const [coracaoRosa, coracaoBatendo, coracaoDecor] = await Promise.all([
    read(`${decorDir}/coracao-rosa.png`),
    read(`${decorDir}/coracao-batendo.png`),
    read(`${decorDir}/coracao-decoracao.png`),
  ])

  const cores = {
    primary: brandM3.defaultColors.primary,
    secondary: brandM3.defaultColors.secondary,
    accent: brandM3.defaultColors.accent,
    cardBg: brandM3.defaultColors.cardBg,
    cardBgEnd: brandM3.defaultColors.cardBgEnd,
  }

  return {
    bg: cores,
    textos: {
      descontoPromo: '38% OFF',
      naLojaToda: true,
      footer:
        '*Frete grátis para Sul/Sudeste acima R$200, outras regiões acima R$299',
    },
    condicoes: [
      { id: 'entrega-turbinada', iconePng: foguete, textos: ['Entrega', 'TURBINADA Liberada'] },
      { id: 'frete-gratis', iconePng: presente, textos: ['FRETE GRÁTIS*', '*condições no rodapé'] },
      { id: 'pague-6x', iconePng: cartao, textos: ['Pague em 6x', 'SEM JUROS'] },
      { id: 'cashback', iconePng: dinheiro, textos: ['CASHBACK', 'na próxima compra'] },
    ],
    tituloPng,
    atrizPng,
    decoracoesPngs: [
      // Desktop coordinates — decorações back (corações de fundo)
      { buffer: coracaoRosa, x: 90, y: 120, w: 80, h: 80, layer: 'back' },
      { buffer: coracaoBatendo, x: 1500, y: 100, w: 70, h: 70, layer: 'back' },
      // Front — perto da atriz
      { buffer: coracaoDecor, x: 1430, y: 180, w: 90, h: 90, layer: 'front' },
    ],
  }
}

async function buildLayersMobile(base: M3Layers): Promise<M3Layers> {
  // Mesmas PNGs, coordenadas mobile (800×600).
  return {
    ...base,
    decoracoesPngs: [
      { buffer: base.decoracoesPngs[0].buffer, x: 30, y: 110, w: 50, h: 50, layer: 'back' },
      { buffer: base.decoracoesPngs[1].buffer, x: 700, y: 30, w: 45, h: 45, layer: 'back' },
      { buffer: base.decoracoesPngs[2].buffer, x: 720, y: 110, w: 55, h: 55, layer: 'front' },
    ],
  }
}

async function main() {
  console.log('═════════ Smoke M3 Sub-Fase 2.2 — composeDesktop + composeMobile ═════════')
  console.log('Pipeline: Sharp BG gradient → Satori overlay → composite layered → WEBP')
  console.log('Inputs: tituloPng (DESCONTÃO DE MÃE) + atrizPng (smoke 2.1) + decorações banco')
  console.log('Custo: $0 (zero IA — reusa PNGs locais)')
  console.log('───────────────────────────────────────────────────────────────────────')

  const outDir = path.resolve(ROOT, 'scripts/smoke-m3-fase2-2/output')

  // Desktop
  console.log('\n──── composeDesktop (1920×550) ────')
  const tDesktop0 = Date.now()
  const baseLayers = await buildLayers()
  const desktopWebp = await composeDesktop(baseLayers)
  const tDesktop = Date.now() - tDesktop0
  const desktopPath = path.join(outDir, 'banner-desktop.webp')
  await writeFile(desktopPath, desktopWebp)
  const desktopMeta = await sharp(desktopWebp).metadata()
  console.log(`[composeDesktop] ${tDesktop}ms · ${desktopMeta.width}x${desktopMeta.height} ${desktopMeta.format} · ${(desktopWebp.length / 1024).toFixed(1)} KB`)
  console.log(`[saved] ${desktopPath}`)
  if (desktopMeta.width !== 1920 || desktopMeta.height !== 550 || desktopMeta.format !== 'webp') {
    throw new Error(`Desktop output inválido: ${desktopMeta.width}x${desktopMeta.height} ${desktopMeta.format}`)
  }

  // Mobile
  console.log('\n──── composeMobile (800×600) ────')
  const tMobile0 = Date.now()
  const mobileLayers = await buildLayersMobile(baseLayers)
  const mobileWebp = await composeMobile(mobileLayers)
  const tMobile = Date.now() - tMobile0
  const mobilePath = path.join(outDir, 'banner-mobile.webp')
  await writeFile(mobilePath, mobileWebp)
  const mobileMeta = await sharp(mobileWebp).metadata()
  console.log(`[composeMobile] ${tMobile}ms · ${mobileMeta.width}x${mobileMeta.height} ${mobileMeta.format} · ${(mobileWebp.length / 1024).toFixed(1)} KB`)
  console.log(`[saved] ${mobilePath}`)
  if (mobileMeta.width !== 800 || mobileMeta.height !== 600 || mobileMeta.format !== 'webp') {
    throw new Error(`Mobile output inválido: ${mobileMeta.width}x${mobileMeta.height} ${mobileMeta.format}`)
  }

  console.log('\n═════════ RESUMO ═════════')
  console.log(`Desktop: ${desktopPath} (${(desktopWebp.length / 1024).toFixed(1)} KB, ${tDesktop}ms)`)
  console.log(`Mobile:  ${mobilePath} (${(mobileWebp.length / 1024).toFixed(1)} KB, ${tMobile}ms)`)
  console.log('Custo total: $0')
  console.log('═══════════════════════════════════════════════════════════════════')
}

main().catch((err) => {
  console.error('FALHOU:', err)
  process.exit(1)
})
