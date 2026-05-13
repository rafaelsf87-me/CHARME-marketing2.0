import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/layout/app-shell'
import { ImageIcon, FileText, BarChart, Lightbulb, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <AppShell>
      <div className="px-11 py-10">
        <div className="mb-3 text-[11.5px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
          Dashboard
        </div>
        <h1 className="m-0 mb-2 text-[28px] font-medium leading-tight tracking-[-0.02em]">
          Bora Criar!!!
        </h1>
        <p className="mb-8 max-w-[380px] text-sm text-[color:var(--text-secondary)]">
          Selecione um módulo para começar a trabalhar.
        </p>

        <div className="grid max-w-[720px] grid-cols-1 gap-2">
          <ModuleCard
            href="/imagens/m4-thumbnails"
            icon={<ImageIcon size={21} color="white" />}
            iconBg="#553679"
            title="Geração de Imagens"
            badge="5 submódulos"
            description="Fotos de produto, posts, banners, thumbnails e emails"
            active
          />
          <ModuleCard
            icon={<FileText size={21} className="text-black/35" />}
            title="Geração de Copy"
            description="Textos para ads, descrições de produto, emails"
            badge="Em breve"
          />
          <ModuleCard
            icon={<BarChart size={21} className="text-black/35" />}
            title="Análise de Ads"
            description="Métricas, insights e otimização de campanhas"
            badge="Em breve"
          />
          <ModuleCard
            icon={<Lightbulb size={21} className="text-black/35" />}
            title="Geração de Ideias"
            description="Brainstorming assistido para campanhas e conteúdo"
            badge="Em breve"
          />
        </div>
      </div>
    </AppShell>
  )
}

interface ModuleCardProps {
  href?: string
  icon: React.ReactNode
  iconBg?: string
  title: string
  badge: string
  description: string
  active?: boolean
}

function ModuleCard({ href, icon, iconBg, title, badge, description, active }: ModuleCardProps) {
  const inner = (
    <div
      className={
        'flex items-center gap-[18px] rounded-xl border border-[color:var(--border-subtle)] px-[22px] py-5 ' +
        (active ? 'cursor-pointer bg-white hover:bg-[#FBFBFA]' : 'cursor-default bg-[#FAFAF9]')
      }
    >
      <div
        className="flex h-[42px] w-[42px] items-center justify-center rounded-[9px]"
        style={{ background: iconBg || '#F4F4F2' }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <div
            className={
              'text-[14.5px] font-medium ' +
              (active ? '' : 'text-[color:var(--text-secondary)]')
            }
          >
            {title}
          </div>
          <div
            className="rounded px-1.5 py-0.5 text-[10.5px] font-medium"
            style={{
              background: active ? '#EEEDFE' : '#F4F4F2',
              color: active ? '#553679' : 'var(--text-secondary)',
            }}
          >
            {badge}
          </div>
        </div>
        <div
          className={
            'text-[12.5px] ' +
            (active ? 'text-[color:var(--text-secondary)]' : 'text-[color:var(--text-tertiary)]')
          }
        >
          {description}
        </div>
      </div>
      {active && <ArrowRight size={17} className="text-black/35" />}
    </div>
  )
  return href ? (
    <Link href={href} className="text-inherit no-underline">
      {inner}
    </Link>
  ) : (
    inner
  )
}
