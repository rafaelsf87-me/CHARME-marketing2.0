/**
 * Gera as masks de segmentação para os 14 templates do M1.
 *
 * 12 templates "simple" (1 imagem): capa, ambiente, elastico (sofa+cadeira × 2 cada)
 *  2 templates "split"  (2 imagens internas: close + zoom): detalhe-tecido (sofa+cadeira × 1 cada)
 * Total: 16 PNGs de entrada, 16 masks de saída.
 *
 * Uso: pnpm m1:generate-masks
 *
 * Pré-requisitos:
 *  - FAL_KEY configurada em .env.local
 *  - PNGs presentes em public/templates/m1/{id}/{image|image-close|image-zoom}.png
 *  - PNGs ausentes são puramente pulados (Rafael ainda está reunindo) — sem falha.
 */

import { readFile, writeFile, access, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { M1_TEMPLATES, type M1Template } from '@/lib/m1/templates'
import { callGroundedSam } from '@/lib/m1/fal-client'

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function generateMask(
  templateId: string,
  movel: M1Template['movel'],
  imageRelPath: string,
  maskRelPath: string
) {
  const imageAbs = path.join(process.cwd(), 'public', imageRelPath)
  const maskAbs = path.join(process.cwd(), 'public', maskRelPath)

  if (!(await fileExists(imageAbs))) {
    console.warn(`⚠ ${templateId} — ${imageRelPath} ausente. Pulando.`)
    return
  }
  if (await fileExists(maskAbs)) {
    console.log(`✓ ${templateId} — ${path.basename(maskRelPath)} já existe, pulando.`)
    return
  }

  console.log(`→ Gerando ${path.basename(maskRelPath)} para ${templateId}...`)
  const imageBuffer = await readFile(imageAbs)
  const textPrompt = movel === 'sofa' ? 'sofa' : 'dining chair'
  const maskBuffer = await callGroundedSam({ imageBuffer, textPrompt })

  await mkdir(path.dirname(maskAbs), { recursive: true })
  await writeFile(maskAbs, maskBuffer)
  console.log(`✓ ${templateId} — mask salva em ${maskRelPath}`)
}

async function processTemplate(template: M1Template) {
  if (template.variant === 'simple') {
    await generateMask(template.id, template.movel, template.imagePath, template.maskPath)
    return
  }
  // split: 2 imagens internas
  await generateMask(template.id, template.movel, template.imageClosePath, template.maskClosePath)
  await generateMask(template.id, template.movel, template.imageZoomPath, template.maskZoomPath)
}

async function main() {
  if (!process.env.FAL_KEY) {
    console.error('Erro: FAL_KEY não configurada. Defina em .env.local antes de rodar.')
    process.exit(1)
  }

  const simpleCount = M1_TEMPLATES.filter((t) => t.variant === 'simple').length
  const splitCount = M1_TEMPLATES.filter((t) => t.variant === 'split').length
  const totalImages = simpleCount + splitCount * 2
  console.log(
    `Gerando masks para ${M1_TEMPLATES.length} templates (${totalImages} imagens: ${simpleCount} simple + ${splitCount}×2 split)...\n`
  )

  for (const template of M1_TEMPLATES) {
    try {
      await processTemplate(template)
    } catch (err) {
      console.error(`✗ ${template.id} falhou:`, err instanceof Error ? err.message : err)
    }
  }
  console.log('\nProcessamento concluído.')
}

main().catch((err) => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
