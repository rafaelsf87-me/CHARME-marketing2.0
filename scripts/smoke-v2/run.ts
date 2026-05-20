/**
 * Smoke V2.0 — Templates fixos (feat/v2-templates)
 *
 * Roda 4 cenários:
 *   A) CAPA-CURTA via auto (briefing curto — ≤120 chars)
 *   B) CAPA-LONGA via auto (briefing longo emocional — >120 chars)
 *   C) Capa com OVERRIDE (briefing médio forçando o oposto do auto)
 *   D) Bônus: modo UPLOAD (placeholder neutral-1 — bypass LLM hero)
 *
 * Custo estimado: 3 chamadas IA gpt-image-1 + 1 chamada LLM (upload)
 *                 = 3×$0.063 + 4×$0.005 = ~$0.21
 *
 * Output: scripts/smoke-v2/output/{cenario}.png + plan.json
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { renderV2ToBuffer } from '../../lib/m2/v2/render'
import type { V2Input } from '../../lib/m2/v2/types'

const OUT_DIR = path.join(process.cwd(), 'scripts', 'smoke-v2', 'output')

// O upload bônus: render.ts suporta file:// pra dev/scripts offline.
const UPLOAD_PLACEHOLDER_URL =
  process.env.SMOKE_V2_UPLOAD_URL ??
  `file://${path.join(process.cwd(), 'public', 'brand', 'm2', 'placeholders', 'neutral-1.png')}`

const CENARIOS: Array<{ nome: string; input: V2Input; expectedVariant?: string }> = [
  // ─── A) CAPA-CURTA via auto ─────────────────────────────────────────────
  {
    nome: 'A-capa-curta-auto',
    input: {
      templateType: 'capa',
      brief: `Como renovar a sala gastando pouco
• PROTEGE contra sujeira e manchas
• TRANSFORMA o visual rápido
• CABE NO BOLSO
• PRÁTICA E FUNCIONAL`,
      variantOverride: 'auto',
      modoGeracao: 'ia',
      logo: 'casinha',
      keyword: 'renovar-sala',
    },
    expectedVariant: 'capa-curta',
  },

  // ─── B) CAPA-LONGA via auto ─────────────────────────────────────────────
  {
    nome: 'B-capa-longa-auto',
    input: {
      templateType: 'capa',
      brief: `O cansaço invisível de quem cuida da casa todos os dias sem reconhecimento
• Não é só a bagunça que cansa, é a constante atenção que pesa
• O esforço de manter tudo funcionando também consome energia mental
Fechamento: Cuidar da casa é um trabalho que muitas vezes não se vê, mas faz toda a diferença / VOCÊ TAMBÉM MERECE SER CUIDADO!`,
      variantOverride: 'auto',
      modoGeracao: 'ia',
      logo: 'casinha',
      keyword: 'cansaco-invisivel',
    },
    expectedVariant: 'capa-longa',
  },

  // ─── C) CTA-FINAL modo upload (BUG-V2-005 — valida cor botão sem custo FAL) ──
  {
    nome: 'C-cta-final-upload',
    input: {
      templateType: 'cta-final',
      brief: `Você merece uma casa que te abraça
• Capas que renovam o ambiente
• Toques que fazem a diferença
Compartilhe com quem ama cuidar do lar`,
      variantOverride: 'auto',
      modoGeracao: 'upload',
      imageUploadUrl: `file://${path.join(process.cwd(), 'public', 'brand', 'm2', 'placeholders', 'neutral-2.png')}`,
      logo: 'casinha',
      keyword: 'cta-share',
    },
    expectedVariant: 'capa-curta',
  },

  // ─── D) Bônus: modo UPLOAD ──────────────────────────────────────────────
  {
    nome: 'D-bonus-upload',
    input: {
      templateType: 'capa',
      brief: `Frequência de rega das suas plantas
• Samambaia
• Fitônia
• Calatéia
• Begônia`,
      variantOverride: 'auto',
      modoGeracao: 'upload',
      imageUploadUrl: UPLOAD_PLACEHOLDER_URL,
      logo: 'casinha',
      keyword: 'rega-plantas',
    },
    expectedVariant: 'capa-curta',
  },
]

async function main() {
  const t0 = Date.now()
  await fs.mkdir(OUT_DIR, { recursive: true })
  console.log(`[smoke-v2] iniciando · ${CENARIOS.length} cenários\n`)

  let totalCost = 0
  const report: Array<{
    nome: string
    ok: boolean
    variant?: string
    expectedVariant?: string
    via?: string
    tookMs?: number
    costUsd?: number
    qcPass?: boolean
    qcIssues?: number
    error?: string
  }> = []

  for (const c of CENARIOS) {
    console.log(`\n─── [${c.nome}] ───`)
    try {
      const result = await renderV2ToBuffer(c.input)
      const filename = `${c.nome}.png`
      await fs.writeFile(path.join(OUT_DIR, filename), result.buffer)
      await fs.writeFile(
        path.join(OUT_DIR, `${c.nome}.plan.json`),
        JSON.stringify({ plan: result.plan, qc: result.qc, via: result.via }, null, 2),
      )
      totalCost += result.costUsd
      const ok = !c.expectedVariant || result.plan.variant === c.expectedVariant
      report.push({
        nome: c.nome,
        ok,
        variant: result.plan.variant,
        expectedVariant: c.expectedVariant,
        via: result.via,
        tookMs: result.tookMs,
        costUsd: result.costUsd,
        qcPass: result.qc.pass,
        qcIssues: result.qc.issues.length,
      })
      console.log(
        `  ✓ ${filename} · variant=${result.plan.variant} (esperado=${c.expectedVariant ?? '—'}) · via=${result.via} · ${(result.tookMs / 1000).toFixed(1)}s · $${result.costUsd.toFixed(4)} · qc=${result.qc.pass ? 'pass' : 'FAIL'}`,
      )
      if (!ok) {
        console.warn(`  ⚠️ variant esperada ${c.expectedVariant}, obtida ${result.plan.variant}`)
      }
      if (!result.qc.pass) {
        console.warn(`  ⚠️ QC issues:`, result.qc.issues.map((i) => i.code))
      }
    } catch (err) {
      report.push({ nome: c.nome, ok: false, error: (err as Error).message })
      console.error(`  ✗ ERROR: ${(err as Error).message}`)
    }
  }

  const totalTime = ((Date.now() - t0) / 1000).toFixed(1)
  await fs.writeFile(
    path.join(OUT_DIR, '_report.json'),
    JSON.stringify({ cenarios: report, totalCostUsd: totalCost, totalTimeS: totalTime }, null, 2),
  )

  console.log(`\n─── SUMÁRIO ───`)
  console.log(`Total: ${totalTime}s · custo $${totalCost.toFixed(4)}`)
  for (const r of report) {
    const icon = r.ok ? '✓' : '✗'
    console.log(`  ${icon} ${r.nome} ${r.error ? `(${r.error})` : `· ${r.variant} · ${r.tookMs}ms`}`)
  }
}

main().catch((err) => {
  console.error('[smoke-v2] fatal:', err)
  process.exit(1)
})
