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

interface CostConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  qtdFotos: number
  custoTotalUsd: number
  onConfirm: () => void
}

export function CostConfirmDialog({
  open,
  onOpenChange,
  qtdFotos,
  custoTotalUsd,
  onConfirm,
}: CostConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Confirmar geração</DialogTitle>
          <DialogDescription>
            Você selecionou {qtdFotos} fotos. Esta geração custará aproximadamente{' '}
            <strong>${custoTotalUsd.toFixed(2)}</strong>. Continuar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={() => {
              onOpenChange(false)
              onConfirm()
            }}
          >
            Gerar {qtdFotos} foto{qtdFotos > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
