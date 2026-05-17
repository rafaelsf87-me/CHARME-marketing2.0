'use client'

import * as React from 'react'
import { Check, Loader2 } from 'lucide-react'

interface LoadingProgressProps {
  atrizMode: 'ia' | 'upload'
  startedAt: number
}

interface Etapa {
  label: string
  ms: number
}

// Timer simulado (V1): cada etapa marca 'done' depois de `ms` ms cumulativos.
// API real pode terminar antes/depois — quando termina, page.tsx desmonta
// este componente. Estimativas conservadoras (lado seguro = engana pra mais).
function buildEtapas(atrizMode: 'ia' | 'upload'): Etapa[] {
  return [
    { label: 'Gerando título 3D', ms: 5_000 },
    atrizMode === 'ia'
      ? { label: 'Gerando atriz com IA (~25s)', ms: 25_000 }
      : { label: 'Removendo fundo da atriz (~5s)', ms: 5_000 },
    { label: 'Carregando decorações', ms: 1_000 },
    { label: 'Compondo banner desktop', ms: 500 },
    { label: 'Compondo banner mobile', ms: 500 },
    { label: 'Upload final', ms: 3_000 },
  ]
}

export function LoadingProgress({ atrizMode, startedAt }: LoadingProgressProps) {
  const etapas = React.useMemo(() => buildEtapas(atrizMode), [atrizMode])
  const [elapsedMs, setElapsedMs] = React.useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => setElapsedMs(Date.now() - startedAt), 200)
    return () => clearInterval(interval)
  }, [startedAt])

  // Calcula qual etapa está active baseado no cumulativo.
  let acumulado = 0
  const status = etapas.map((e) => {
    acumulado += e.ms
    if (elapsedMs >= acumulado) return 'done' as const
    if (elapsedMs >= acumulado - e.ms) return 'active' as const
    return 'pending' as const
  })

  const elapsedSec = (elapsedMs / 1000).toFixed(1)

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-[#FCE7F3] bg-[#FDF2F8] p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-[color:var(--text-primary)]">
          <Loader2 className="h-4 w-4 animate-spin text-[#E91E63]" />
          Gerando seus banners…
        </h2>
        <span className="tabular-nums text-xs text-[color:var(--text-secondary)]">{elapsedSec}s</span>
      </div>

      <ol className="flex flex-col gap-2">
        {etapas.map((e, idx) => {
          const s = status[idx]
          return (
            <li key={`${e.label}-${idx}`} className="flex items-center gap-3 text-sm">
              <span
                className={[
                  'flex h-6 w-6 items-center justify-center rounded-full',
                  s === 'done'
                    ? 'bg-[#16A34A] text-white'
                    : s === 'active'
                    ? 'bg-[#E91E63] text-white'
                    : 'bg-white text-[color:var(--text-tertiary)] ring-1 ring-[color:var(--border-default)]',
                ].join(' ')}
              >
                {s === 'done' ? (
                  <Check size={14} />
                ) : s === 'active' ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <span className="text-[10px] tabular-nums">{idx + 1}</span>
                )}
              </span>
              <span
                className={
                  s === 'pending'
                    ? 'text-[color:var(--text-tertiary)]'
                    : 'text-[color:var(--text-primary)]'
                }
              >
                {e.label}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="text-[11px] text-[color:var(--text-tertiary)]">
        Tempo estimado total: ~30s. Não feche a aba — o processo está rodando no servidor.
      </p>
    </section>
  )
}
