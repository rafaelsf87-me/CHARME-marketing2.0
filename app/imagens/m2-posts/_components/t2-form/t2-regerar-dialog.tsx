'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const MIN = 5
const MAX = 300

interface T2RegerarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slideId: string | null
  onConfirm: (ajustePrompt: string) => void
  submitting?: boolean
}

export function T2RegerarDialog({
  open,
  onOpenChange,
  slideId,
  onConfirm,
  submitting,
}: T2RegerarDialogProps) {
  const [prompt, setPrompt] = React.useState('')

  React.useEffect(() => {
    if (!open) setPrompt('')
  }, [open])

  const len = prompt.trim().length
  const valid = len >= MIN && len <= MAX
  const disabled = !valid || submitting

  return (
    <Dialog open={open} onOpenChange={(o) => (!submitting ? onOpenChange(o) : null)}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Regerar {slideId ? slideId : 'slide'}</DialogTitle>
          <DialogDescription>
            Quais ajustes você quer fazer neste slide? Heurística: &quot;trocar fundo&quot;,
            &quot;deixar mais claro&quot;, &quot;encurtar texto&quot;, &quot;regerar imagem com
            iluminação mais suave&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={MAX}
            placeholder="Ex.: trocar o fundo pra uma variante mais escura"
            rows={4}
            disabled={submitting}
            autoFocus
          />
          <div className="flex items-center justify-between text-[11px] text-[color:var(--text-tertiary)]">
            <span>
              ~$0 se só layout/fundo. ~$0.25 se regerar imagem IA.
            </span>
            <span className="tabular-nums">{len}/{MAX}</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="brand"
            disabled={disabled}
            onClick={() => onConfirm(prompt.trim())}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Regerando…
              </>
            ) : (
              'Aplicar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
