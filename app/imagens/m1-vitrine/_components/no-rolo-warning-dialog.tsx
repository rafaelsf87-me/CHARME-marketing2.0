'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface NoRoloWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Usuário decidiu seguir sem a foto do rolo.
  onConfirm: () => void
}

// Aviso ao gerar sem foto do rolo de tecido (campo opcional/recomendado).
// "Cancelar" volta para o form; "Gerar mesmo assim" prossegue.
export function NoRoloWarningDialog({
  open,
  onOpenChange,
  onConfirm,
}: NoRoloWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Gerar sem foto do rolo de tecido?</DialogTitle>
          <DialogDescription>
            A foto do rolo melhora a fidelidade do padrão e da textura. Sem ela, o
            resultado pode ter padrão menos preciso. Recomendamos adicionar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Adicionar foto do rolo
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={() => {
              onOpenChange(false)
              onConfirm()
            }}
          >
            Gerar mesmo assim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
