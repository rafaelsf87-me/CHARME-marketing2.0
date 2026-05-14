/**
 * Gera as masks de segmentação para os 11 templates do M1 (Foto Capa e
 * Foto Ambiente). Rodar 1x antes do M1 entrar em produção, e novamente
 * sempre que um template for adicionado ou substituído.
 *
 * Uso: pnpm m1:generate-masks
 *
 * Pré-requisitos:
 *  - FAL_KEY configurada em .env.local
 *  - 11 PNGs presentes em public/templates/m1/{id}/image.png
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

async function generateMaskForTemplate(template: M1Template) {
  const imageAbsPath = path.join(process.cwd(), 'public', template.imagePath)
  const maskAbsPath = path.join(process.cwd(), 'public', template.maskPath)

  if (!(await fileExists(imageAbsPath))) {
    console.warn(`⚠ ${template.id} — image.png ausente (${template.imagePath}). Pulando.`)
    return
  }

  if (await fileExists(maskAbsPath)) {
    console.log(`✓ ${template.id} — mask já existe, pulando.`)
    return
  }

  console.log(`→ Gerando mask para ${template.id}...`)

  const imageBuffer = await readFile(imageAbsPath)
  const textPrompt = template.movel === 'sofa' ? 'sofa' : 'dining chair'

  const maskBuffer = await callGroundedSam({ imageBuffer, textPrompt })

  await mkdir(path.dirname(maskAbsPath), { recursive: true })
  await writeFile(maskAbsPath, maskBuffer)
  console.log(`✓ ${template.id} — mask salva em ${template.maskPath}`)
}

async function main() {
  if (!process.env.FAL_KEY) {
    console.error('Erro: FAL_KEY não configurada. Defina em .env.local antes de rodar.')
    process.exit(1)
  }

  console.log(`Gerando masks para ${M1_TEMPLATES.length} templates...\n`)
  for (const template of M1_TEMPLATES) {
    try {
      await generateMaskForTemplate(template)
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
