'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'

export function TooltipInfo({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Mais informações"
            className="inline-flex h-4 w-4 items-center justify-center text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)]"
          >
            <HelpCircle size={13} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] text-xs leading-snug">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
