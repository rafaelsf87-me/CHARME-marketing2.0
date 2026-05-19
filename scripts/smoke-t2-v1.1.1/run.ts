/**
 * Smoke T2 V1.1.1 — Validação dos 6 fixes pré-push
 *
 * Input EXATO do smoke prod cama/inverno que Rafael testou (recreado):
 *   Tema: "5 erros que fazem você sentir frio na cama mesmo com cobertor pesado"
 *
 * Valida:
 * - FIX 1 (BUG-M2-008): Slide 1 (cover) com imagem hero
 * - FIX 2 (BUG-M2-009): Slide 5 (cta_final) com IMAGEM ao centro
 * - FIX 3 (BUG-M2-010): Slide 3 (comparison antes/depois) detectado pelo LLM
 * - FIX 4 (MEL-M2-015): Footer @charmedodetalhe em TODOS os slides exceto cta-final (embutido)
 * - FIX 5 (MEL-M2-017): Overlays decorativos brand visíveis em todos os slides
 * - FIX 6 (MEL-M2-004): Comparison via img2img edit-image — forma física idêntica
 *
 * Custo esperado: ~$2.50 (5 imagens IA + 1 img2img extra + 4-5 LLM parsings)
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { renderM2T2 } from '../../lib/m2/t2/render'
import type { T2Input } from '../../lib/m2/t2/types'

const OUT_DIR = path.join(process.cwd(), 'scripts', 'smoke-t2-v1.1.1', 'output')

async function localUploadFn(buffer: Buffer, key: string): Promise<string> {
  const safe = key.replace(/\//g, '_')
  const out = path.join(OUT_DIR, safe)
  await fs.writeFile(out, buffer)
  return `file://${out}`
}

async function main() {
  const startedAt = Date.now()
  await fs.mkdir(OUT_DIR, { recursive: true })
  console.log('[smoke-t2-v1.1.1] iniciando smoke 6 fixes — cama/inverno…\n')

  const input: T2Input = {
    modo: 'carrossel',
    templateId: 'pipeline-hibrido-v2',
    logo: 'casinha',
    contextoGeral: '5 erros que fazem você sentir frio na cama mesmo com cobertor pesado',
    modoGeracao: 'ia',
    slides: [
      // Slide 1 — cover (FIX 1: imagem hero presente)
      {
        copyTexto: `Texto: 5 erros que fazem você sentir frio na cama mesmo com cobertor pesado
Apoio: descobrimos o que muita gente erra sem perceber
Descrição da imagem: cozy bedroom scene with thick blanket on bed, warm tones, inviting atmosphere`,
      },
      // Slide 2 — content (regular content_3 com bullets + imagem lateral)
      {
        copyTexto: `Texto: Erros 1 e 2 que esfriam a noite
Bullet: Lençol fino sob o cobertor pesado — falta camada quente perto do corpo
Bullet: Pé descoberto pra fora do edredom — perda de calor rápida
Descrição da imagem: thin bedsheet folded showing weave detail, light cotton fabric`,
      },
      // Slide 3 — comparison (FIX 3: LLM deve detectar antes/depois)
      {
        copyTexto: `Texto: Cobertor pesado único vs camadas leves: a diferença real
Apoio: 1 peça grossa não retém calor melhor que 3 leves sobrepostas
Descrição da imagem antes: one single very thick heavy blanket on a bed, dark heavy fabric
Descrição da imagem depois: three light layered blankets stacked on a bed, soft pastel layers visible`,
      },
      // Slide 4 — content (mais um content)
      {
        copyTexto: `Texto: Erros 4 e 5 que destroem o calor
Bullet: Janela com vão de ar — corrente fria por baixo da porta ou batente
Bullet: Quarto muito seco — ar seco rouba a sensação térmica
Descrição da imagem: window with curtain partially open showing cold air gap, winter morning light`,
      },
      // Slide 5 — cta_final (FIX 2: imagem hero ao centro)
      {
        copyTexto: `Texto: Veja o cobertor de inverno Charme
Apoio: 3 camadas leves que mantêm o calor sem peso
CTA: CONHEÇA NA LOJA
Descrição da imagem: premium layered blanket set folded, soft cream and beige tones, luxurious texture`,
      },
    ],
  }

  console.log(`[smoke-t2-v1.1.1] ${input.slides.length} slides — chamando renderM2T2 (parser LLM + IA + img2img)…`)
  const output = await renderM2T2(input, { uploadFn: localUploadFn })

  for (const result of output.results) {
    const localPath = result.url.replace(/^file:\/\//, '')
    const dest = path.join(OUT_DIR, `smoke-slide-${result.slideIndex + 1}.png`)
    await fs.copyFile(localPath, dest)
    console.log(
      `  ✓ slide ${result.slideIndex + 1}/${output.results.length} — QC=${result.qc.qualityScore} (${result.qc.errors.length}e/${result.qc.warnings.length}w)`,
    )
  }

  const qcReport = {
    timestamp: new Date().toISOString(),
    tookMs: output.tookMs,
    slides: output.results.map((r) => ({
      slideIndex: r.slideIndex,
      slideId: r.slideId,
      qcPass: r.qc.pass,
      qualityScore: r.qc.qualityScore,
      errors: r.qc.errors,
      warnings: r.qc.warnings,
    })),
    consolidated: {
      pass: output.results.every((r) => r.qc.pass),
      avgScore:
        output.results.reduce((s, r) => s + r.qc.qualityScore, 0) /
        output.results.length,
      totalErrors: output.results.reduce((s, r) => s + r.qc.errors.length, 0),
      totalWarnings: output.results.reduce((s, r) => s + r.qc.warnings.length, 0),
    },
  }
  await fs.writeFile(
    path.join(OUT_DIR, 'qc-report.json'),
    JSON.stringify(qcReport, null, 2),
  )

  await fs.writeFile(
    path.join(OUT_DIR, 'llm-parser-log.json'),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalCalls: output.parserResults?.length ?? 0,
        results: output.parserResults,
      },
      null,
      2,
    ),
  )

  const tookSec = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`\n[smoke-t2-v1.1.1] OK em ${tookSec}s`)
  console.log(`  consolidated QC pass: ${qcReport.consolidated.pass}`)
  console.log(`  avg score: ${qcReport.consolidated.avgScore.toFixed(1)}/100`)
  console.log(`  outputs: ${OUT_DIR}/`)

  if (!qcReport.consolidated.pass) {
    console.error('\n[smoke-t2-v1.1.1] FAIL — QC consolidado falhou')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[smoke-t2-v1.1.1] ERRO:', err)
  process.exit(1)
})
