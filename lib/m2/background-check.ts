import sharp from 'sharp'

// Validador de fundo (hotfix v8, 18/05/2026). Sharp amostra 4 cantos
// 200×200 do output do FAL e classifica como "ruim" cantos com baixa
// saturação E brightness extremo (preto/branco/cinza neutro). Se ≥2
// cantos ruins, considera output sem gradient cyan→roxo — gatilho pra
// retry no orquestrador.

const CORNER_SIZE = 200
const MAX_BAD_CORNERS = 2 // pelo menos 2 cantos ruins → fundo problemático
const SAT_THRESHOLD = 15 // 0-255: saturação baixa = neutro
const DARK_THRESHOLD = 40 // brightness < 40 = quase preto
const LIGHT_THRESHOLD = 215 // brightness > 215 = quase branco

/**
 * Retorna true se o output parece ter gradient cyan→roxo nos cantos.
 * Retorna false se ≥2 cantos têm fundo sólido (preto/branco/cinza neutro).
 */
export async function isBackgroundGradient(buffer: Buffer): Promise<boolean> {
  const meta = await sharp(buffer).metadata()
  const w = meta.width ?? 1024
  const h = meta.height ?? 1536

  const corners = [
    { left: 0, top: 0 },
    { left: w - CORNER_SIZE, top: 0 },
    { left: 0, top: h - CORNER_SIZE },
    { left: w - CORNER_SIZE, top: h - CORNER_SIZE },
  ]

  let badCorners = 0
  for (const corner of corners) {
    const region = await sharp(buffer)
      .extract({ ...corner, width: CORNER_SIZE, height: CORNER_SIZE })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const stats = computeHSLStats(region.data)

    // Fundo ruim: saturação muito baixa E brightness extremo
    if (
      stats.avgSaturation < SAT_THRESHOLD &&
      (stats.avgBrightness < DARK_THRESHOLD || stats.avgBrightness > LIGHT_THRESHOLD)
    ) {
      badCorners++
    }
  }

  return badCorners < MAX_BAD_CORNERS
}

function computeHSLStats(pixels: Buffer): { avgSaturation: number; avgBrightness: number } {
  let totalSat = 0
  let totalLum = 0
  let count = 0
  for (let i = 0; i < pixels.length; i += 3) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const lum = (max + min) / 2
    const sat =
      max === min
        ? 0
        : lum > 127.5
          ? ((max - min) * 255) / (510 - max - min)
          : ((max - min) * 255) / (max + min)
    totalSat += sat
    totalLum += lum
    count++
  }
  return { avgSaturation: totalSat / count, avgBrightness: totalLum / count }
}
