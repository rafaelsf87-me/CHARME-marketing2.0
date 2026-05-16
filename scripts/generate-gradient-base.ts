/**
 * Gera public/brand/m2/backgrounds/gradient-base.png — base de fundo do T1.
 *
 * Uso (one-shot, resultado vai pro repo):
 *   pnpm m2:gen-gradient
 *
 * Hotfix v6 (18/05/2026): T1 passa a sempre chamar gpt-image-1/edit-image com
 * esse PNG como primeira reference image, pra travar o gradient cyan→roxo
 * (resolve fundo preto/branco aleatório que escapava do `BACKGROUND ENFORCEMENT`
 * no prompt).
 *
 * Dimensões: 1024×1536 (match nativo gpt-image-1 portrait, ratio 2:3).
 * Gradient: diagonal linear top-left #00E5E5 → bottom-right #5B1E7D, smooth.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const WIDTH = 1024
const HEIGHT = 1536
const CYAN = '#00E5E5'
const PURPLE = '#5B1E7D'

async function main() {
  const outDir = path.resolve(process.cwd(), 'public', 'brand', 'm2', 'backgrounds')
  await mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, 'gradient-base.png')

  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${CYAN}" />
      <stop offset="100%" stop-color="${PURPLE}" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)" />
</svg>`

  const png = await sharp(Buffer.from(svg))
    .flatten({ background: { r: 0, g: 0, b: 0 } }) // garante RGB sem alpha
    .png({ compressionLevel: 9 })
    .toBuffer()

  await writeFile(outPath, png)
  console.log(`✓ ${outPath} (${WIDTH}×${HEIGHT}, ${png.length} bytes)`)
}

main().catch((err) => {
  console.error('FALHOU:', err)
  process.exit(1)
})
