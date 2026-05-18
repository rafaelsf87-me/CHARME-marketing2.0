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

interface RegerarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (ajustePrompt: string) => void
  submitting?: boolean
}

export function RegerarDialog({ open, onOpenChange, onConfirm, submitting }: RegerarDialogProps) {
  const [prompt, setPrompt] = React.useState('')

  React.useEffect(() => {
    if (!open) setPrompt('')
  }, [open])

  const len = prompt.trim().length
  const valid = len >= MIN && len <= MAX
  const disabled = !valid || submitting

  return (
    <Dialog open={open} onOpenChange={(o) => (!submitting ? onOpenChange(o) : null)}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Regerar imagem</DialogTitle>
          <DialogDescription>
            Descreva o ajuste que você quer nessa imagem específica.
            Ex.: &quot;corrigir cor da capa&quot;, &quot;remover sombra estranha&quot;,
            &quot;iluminação mais clara&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={MAX}
            placeholder="Ex.: deixar a iluminação mais clara e suave"
            rows={4}
            disabled={submitting}
            autoFocus
          />
          <div className="flex items-center justify-between text-[11px] text-[color:var(--text-tertiary)]">
            <span>~$0.05 por regeração</span>
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
                Regerando...
              </>
            ) : (
              'Regerar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
