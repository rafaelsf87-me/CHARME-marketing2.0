import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export type Crumb = { label: string; href?: string }

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <div className="mb-3.5 flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)]">
      {items.map((c, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {c.href && !isLast ? (
              <Link href={c.href} className="text-inherit hover:text-[color:var(--text-primary)]">
                {c.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-[color:var(--text-primary)]' : undefined}>
                {c.label}
              </span>
            )}
            {!isLast && <ChevronRight size={12} />}
          </span>
        )
      })}
    </div>
  )
}
