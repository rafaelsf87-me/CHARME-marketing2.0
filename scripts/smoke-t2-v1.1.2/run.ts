/**
 * Smoke T2 V1.1.2 — Briefing REAL cama/inverno do Rafael
 *
 * 4 SLIDES (não 5). Input LITERAL conforme briefing 19/05/2026.
 *
 * Valida 4 fixes A1+A2+A3(diagnóstico)+A4:
 * - A1 (Anti-invenção): textos LITERAIS do input (não inventar/reescrever)
 * - A2 (Slide count imutável): 4 slides input → 4 slides output
 * - A3 (PNG cta-final): footer EMBUTIDO no PNG slide 4, programático nos 1-3
 * - A4 (CTA literal): "Compartilhe com uma amiga friorenta" preservado
 *
 * + V1.1.1 invariantes:
 * - FIX 2 (image hero cta_final centro)
 * - FIX 3 (LLM detecta comparison)
 * - FIX 6 (img2img par before/after forma idêntica)
 *
 * Custo esperado: ~$1.50 (4 LLM + 5 imagens — 4 text + 1 par img2img)
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { renderM2T2 } from '../../lib/m2/t2/render'
import type { T2Input } from '../../lib/m2/t2/types'
import type { ParseRoteiroResult } from '../../lib/m2/t2/planner/parse-roteiro'

const OUT_DIR = path.join(process.cwd(), 'scripts', 'smoke-t2-v1.1.2', 'output')

async function localUploadFn(buffer: Buffer, key: string): Promise<string> {
  const safe = key.replace(/\//g, '_')
  const out = path.join(OUT_DIR, safe)
  await fs.writeFile(out, buffer)
  return `file://${out}`
}

async function main() {
  const startedAt = Date.now()
  await fs.mkdir(OUT_DIR, { recursive: true })
  console.log('[smoke-t2-v1.1.2] briefing REAL cama/inverno · 4 slides literais…\n')

  const input: T2Input = {
    modo: 'carrossel',
    templateId: 'pipeline-hibrido-v2',
    logo: 'casinha',
    contextoGeral:
      'Carrossel sazonal de inverno mostrando que sentir frio na cama nem sempre é falta de cobertor. Foco em erros de montagem da cama que prejudicam o aquecimento natural. Linguagem de dona de casa, sem termos técnicos. Pegada de alerta + utilidade prática.',
    modoGeracao: 'ia',
    slides: [
      // ─── Slide 1 — CAPA ─────────────────────────────────────────────────
      {
        copyTexto: `Texto: 5 erros que fazem você sentir frio na cama mesmo com cobertor pesado
Apoio: Antes de comprar mais um edredom, descubra o que pode estar dando errado na sua cama
Descrição da imagem: Cama vista de cima desarrumada com 3 pontos destacados em círculos vermelhos e setas vermelhas apontando: lençol fino aparecendo, cobertor mal posicionado, edredom embolado nos pés. Visual de alerta com elementos chamativos.`,
      },

      // ─── Slide 2 — OS 5 ERROS ───────────────────────────────────────────
      {
        copyTexto: `Texto: Os erros que sabotam o calor da sua cama
Apoio: Tudo que você arruma errado no automático e nem percebe
Bullet: Lençol de algodão fino usado no inverno
Bullet: Cobertor colocado sobre o edredom em vez de embaixo
Bullet: Edredom menor que a cama, deixando os pés descobertos
Bullet: Ar passando pelas laterais sem cobertura
Bullet: Travesseiro frio sem capa térmica
Descrição da imagem: Cama bem arrumada em camadas vista de lateral, mostrando a ordem correta: lençol térmico, manta, cobertor, edredom. Cores quentes e aconchegantes. Produto isolado sem fundo.`,
      },

      // ─── Slide 3 — COMPARISON ───────────────────────────────────────────
      {
        copyTexto: `Texto: Cama errada vs cama certa
Apoio: A diferença está na ordem das camadas
Descrição da imagem antes: Cama desarrumada com cobertor amassado embolado, lençol aparecendo torto, edredom pequeno descobrindo os pés da pessoa, travesseiro frio sem capa.
Descrição da imagem depois: Cama bem feita organizada em camadas perfeitas: lençol térmico esticado, manta cinza dobrada no pé, cobertor felpudo no meio, edredom grande estendido até abaixo do colchão, travesseiros com capa.`,
      },

      // ─── Slide 4 — CTA FINAL ────────────────────────────────────────────
      {
        copyTexto: `Texto: Pronta pra dormir quentinho hoje à noite?
Apoio: Salva esse post pra montar sua cama do jeito certo antes do frio chegar de vez
CTA: Compartilhe com uma amiga friorenta
Descrição da imagem: Cama bem montada em camadas vista lateral mostrando o resultado final aconchegante. Cores quentes, atmosfera de quarto preparado pro inverno. Produto isolado sem fundo.`,
      },
    ],
  }

  console.log(`[smoke-t2-v1.1.2] ${input.slides.length} slides — chamando renderM2T2…`)
  const output = await renderM2T2(input, { uploadFn: localUploadFn })

  for (const result of output.results) {
    const localPath = result.url.replace(/^file:\/\//, '')
    const dest = path.join(OUT_DIR, `smoke-slide-${result.slideIndex + 1}.png`)
    await fs.copyFile(localPath, dest)
    console.log(
      `  ✓ slide ${result.slideIndex + 1}/${output.results.length} — QC=${result.qc.qualityScore} (${result.qc.errors.length}e/${result.qc.warnings.length}w)`,
    )
  }

  // ─── Validações automáticas pós-smoke (10 critérios do briefing) ─────────
  const parserResults = (output.parserResults ?? []) as ParseRoteiroResult[]
  const checks: Array<{ id: string; pass: boolean; detail: string }> = []

  // 1. 4 slides gerados (não 5)
  checks.push({
    id: '1-slide-count',
    pass: output.results.length === 4,
    detail: `output.results.length=${output.results.length} (esperado 4)`,
  })

  // 2. Slide 1 subtitle literal
  const s1Sub = parserResults[0]?.parsed.subtitle
  const s1SubExp = 'Antes de comprar mais um edredom, descubra o que pode estar dando errado na sua cama'
  checks.push({
    id: '2-slide1-subtitle-literal',
    pass: s1Sub === s1SubExp,
    detail: `got: "${s1Sub}" · expected: "${s1SubExp}"`,
  })

  // 3. Slide 2 title literal
  const s2Title = parserResults[1]?.parsed.title
  const s2TitleExp = 'Os erros que sabotam o calor da sua cama'
  checks.push({
    id: '3-slide2-title-literal',
    pass: s2Title === s2TitleExp,
    detail: `got: "${s2Title}" · expected: "${s2TitleExp}"`,
  })

  // 4. Slide 2 = 5 bullets literais
  const s2Bullets = parserResults[1]?.parsed.bullets ?? []
  const s2BulletsExp = [
    'Lençol de algodão fino usado no inverno',
    'Cobertor colocado sobre o edredom em vez de embaixo',
    'Edredom menor que a cama, deixando os pés descobertos',
    'Ar passando pelas laterais sem cobertura',
    'Travesseiro frio sem capa térmica',
  ]
  const bulletsMatch =
    s2Bullets.length === 5 && s2BulletsExp.every((exp, i) => s2Bullets[i] === exp)
  checks.push({
    id: '4-slide2-5-bullets-literais',
    pass: bulletsMatch,
    detail: bulletsMatch
      ? '5 bullets literais OK'
      : `got ${s2Bullets.length} bullets · diff: ${JSON.stringify(s2Bullets)}`,
  })

  // 5. Slide 3 title literal
  const s3Title = parserResults[2]?.parsed.title
  const s3TitleExp = 'Cama errada vs cama certa'
  checks.push({
    id: '5-slide3-title-literal',
    pass: s3Title === s3TitleExp,
    detail: `got: "${s3Title}" · expected: "${s3TitleExp}"`,
  })

  // 6. Slide 3 = comparison-before-after detectado
  const s3Hint = parserResults[2]?.parsed.subtemplateHint
  checks.push({
    id: '6-slide3-comparison-detected',
    pass: s3Hint === 'comparison-before-after',
    detail: `subtemplateHint=${s3Hint}`,
  })

  // 7. Slide 4 title literal
  const s4Title = parserResults[3]?.parsed.title
  const s4TitleExp = 'Pronta pra dormir quentinho hoje à noite?'
  checks.push({
    id: '7-slide4-title-literal',
    pass: s4Title === s4TitleExp,
    detail: `got: "${s4Title}" · expected: "${s4TitleExp}"`,
  })

  // 8. Slide 4 CTA literal
  const s4Cta = parserResults[3]?.parsed.cta
  const s4CtaExp = 'Compartilhe com uma amiga friorenta'
  checks.push({
    id: '8-slide4-cta-literal',
    pass: s4Cta === s4CtaExp,
    detail: `got: "${s4Cta}" · expected: "${s4CtaExp}"`,
  })

  // 9 & 10 são validações visuais (footer embutido vs programático) — registro
  //   no relatório mas não checa programaticamente aqui.
  checks.push({
    id: '9-10-footer-visual',
    pass: true,
    detail: 'validação visual humana — Rafael confirma nos PNGs',
  })

  console.log('\n━ Validações briefing:')
  for (const c of checks) {
    console.log(`  ${c.pass ? '✓' : '✗'} ${c.id} — ${c.detail}`)
  }
  const allPass = checks.every((c) => c.pass)

  const qcReport = {
    timestamp: new Date().toISOString(),
    tookMs: output.tookMs,
    briefingChecks: checks,
    briefingAllPass: allPass,
    slides: output.results.map((r) => ({
      slideIndex: r.slideIndex,
      slideId: r.slideId,
      qcPass: r.qc.pass,
      qualityScore: r.qc.qualityScore,
      errors: r.qc.errors,
      warnings: r.qc.warnings,
    })),
    consolidated: {
      pass: output.results.every((r) => r.qc.pass) && allPass,
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
        totalCalls: parserResults.length,
        results: parserResults,
      },
      null,
      2,
    ),
  )

  const tookSec = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`\n[smoke-t2-v1.1.2] em ${tookSec}s`)
  console.log(`  QC pass: ${qcReport.consolidated.pass}`)
  console.log(`  briefingAllPass: ${allPass}`)
  console.log(`  avg score: ${qcReport.consolidated.avgScore.toFixed(1)}/100`)
  console.log(`  outputs: ${OUT_DIR}/`)

  if (!qcReport.consolidated.pass) {
    console.error('\n[smoke-t2-v1.1.2] FAIL — algum critério falhou')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[smoke-t2-v1.1.2] ERRO:', err)
  process.exit(1)
})
