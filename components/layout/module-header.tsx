import type { LucideIcon } from 'lucide-react'

interface ModuleHeaderProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function ModuleHeader({ icon: Icon, title, description }: ModuleHeaderProps) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-3">
        <Icon className="size-7 text-[color:var(--text-primary)]" strokeWidth={1.75} />
        <h1 className="m-0 text-[24px] font-semibold uppercase leading-none tracking-[0.04em]">
          {title}
        </h1>
      </div>
      {description && (
        <p className="mt-2.5 max-w-[560px] text-[13.5px] text-[color:var(--text-secondary)]">
          {description}
        </p>
      )}
    </div>
  )
}
