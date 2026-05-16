import sharp from 'sharp'
import { brandM2 } from '@/lib/brand/m2.brand'

const { width: TARGET_W, height: TARGET_H } = brandM2.dimensions.final

/**
 * Baixa a imagem da URL retornada pelo FAL e converte pra 1080×1350 PNG.
 *
 * Input nativo do gpt-image-1: 1024×1536 (ratio 2:3).
 * Target: 1080×1350 (ratio 4:5 = 0.8).
 *
 * fit:'cover' + position:'center' escala largura pra 1080 (vira 1080×1620)
 * e crop simétrico top/bottom (135px de cada lado) pra chegar a 1350.
 *
 * T1 (Atual_Maio26) NÃO aplica footer overlay aqui — composição inteira fica
 * por conta do gpt-image-1 (réplica do ChatGPT Plus). Footer programático
 * fica reservado pro T2 (Pipeline Híbrido Sharp/Satori, Fase 3).
 */
export async function resizeTo1080x1350(inputUrl: string): Promise<Buffer> {
  const response = await fetch(inputUrl)
  if (!response.ok) {
    throw new Error(`[M2] Falha ao baixar imagem do FAL (${response.status})`)
  }
  const arrayBuf = await response.arrayBuffer()
  const buf = Buffer.from(arrayBuf)

  return sharp(buf)
    .resize({ width: TARGET_W, height: TARGET_H, fit: 'cover', position: 'center' })
    .png()
    .toBuffer()
}
