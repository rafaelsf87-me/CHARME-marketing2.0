'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Home, Image as ImageIcon, ChevronDown, ChevronRight, LogOut, Users } from 'lucide-react'
import { brandBase } from '@/lib/brand/base.config'
import { cn } from '@/lib/utils'

const submodules = [
  { href: '/imagens/m1-vitrine', label: 'M1 · Vitrine' },
  { href: '/imagens/m2-posts', label: 'M2 · Posts' },
  { href: '/imagens/m3-banners', label: 'M3 · Banners' },
  { href: '/imagens/m4-thumbnails', label: 'M4 · Thumbnails' },
  { href: '/imagens/m5-email', label: 'M5 · Email' },
  { href: '/imagens/template-creator', label: 'Template Creator' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const inImagens = pathname?.startsWith('/imagens') ?? false
  const [imagensOpen, setImagensOpen] = React.useState(inImagens)

  React.useEffect(() => {
    if (inImagens) setImagensOpen(true)
  }, [inImagens])

  const userName = session?.user?.name || session?.user?.email || 'Usuário'
  const initials = userName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const role = session?.user?.role === 'admin' ? 'Admin' : 'Operador'
  const isAdmin = session?.user?.role === 'admin'

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname?.startsWith(href + '/')

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-[color:var(--border-subtle)] bg-white">
      <div className="flex items-center gap-3 px-5 pb-5 pt-[22px]">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{ background: brandBase.colors.primaryDark }}
        >
          <Home size={17} color="white" />
        </div>
        <div className="leading-tight">
          <div className="text-[13.5px] font-medium">{brandBase.systemName}</div>
          <div className="mt-[3px] text-[11.5px] text-[color:var(--text-secondary)]">
            {brandBase.name}
          </div>
        </div>
      </div>

      <div className="mx-4 mb-3 h-px bg-[color:var(--border-subtle)]" />

      <nav className="flex-1 overflow-y-auto px-2.5">
        <SectionLabel>Geral</SectionLabel>
        <NavLink href="/" icon={<Home size={17} />} active={isActive('/')}>
          Home
        </NavLink>

        <SectionLabel>Módulos</SectionLabel>
        <button
          type="button"
          onClick={() => setImagensOpen((s) => !s)}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-[9px] text-[13px] transition hover:bg-black/[0.04]',
            inImagens ? 'font-medium text-[color:var(--text-primary)]' : 'text-[color:var(--text-secondary)]'
          )}
        >
          <ImageIcon size={17} />
          <span>Geração de Imagens</span>
          {imagensOpen ? (
            <ChevronDown size={13} className="ml-auto opacity-40" />
          ) : (
            <ChevronRight size={13} className="ml-auto opacity-40" />
          )}
        </button>

        {imagensOpen && (
          <div className="animate-fade-in pb-1 pl-7 pt-1">
            {submodules.map((m) => (
              <SubNavLink key={m.href} href={m.href} active={isActive(m.href)}>
                {m.label}
              </SubNavLink>
            ))}
          </div>
        )}

        {isAdmin && (
          <>
            <SectionLabel>Administração</SectionLabel>
            <NavLink href="/admin/usuarios" icon={<Users size={17} />} active={isActive('/admin/usuarios')}>
              Usuários
            </NavLink>
          </>
        )}
      </nav>

      <div className="flex items-center gap-3 border-t border-[color:var(--border-subtle)] px-4 py-3.5">
        <div
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-[11.5px] font-medium"
          style={{ background: '#EEEDFE', color: brandBase.colors.primaryDark }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium">{userName}</div>
          <div className="mt-0.5 text-[10.5px] text-[color:var(--text-secondary)]">{role}</div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          aria-label="Sair"
          className="inline-flex items-center justify-center rounded-md border border-[color:var(--border-default)] px-2 py-1.5 hover:bg-black/[0.04]"
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-3.5 text-[10.5px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
      {children}
    </div>
  )
}

function NavLink({
  href,
  icon,
  active,
  children,
}: {
  href: string
  icon: React.ReactNode
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-[9px] text-[13px] transition hover:bg-black/[0.04]',
        active ? 'font-medium text-[color:var(--text-primary)]' : 'text-[color:var(--text-secondary)]'
      )}
    >
      {icon}
      {children}
    </Link>
  )
}

function SubNavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'block rounded-md px-3 py-[7px] text-[12.5px] transition hover:bg-black/[0.04]',
        active ? 'font-medium text-[color:var(--text-primary)]' : 'text-[color:var(--text-secondary)]'
      )}
    >
      {children}
    </Link>
  )
}
