'use client'

import { cn } from '@portal/ui/cn'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isActive, profileNav, studentNavFor } from '@/config/nav'
import { Logo } from './Logo'
import { NavIcon } from './NavIcon'

/** Barra lateral (desktop ≥ 1024 px). */
/** Quem está logado (nome, iniciais e turma) — vem do layout, lido no servidor. */
export type Viewer = { name: string; initials: string; cohort: string }

export function StudentSidebar({ viewer, workflows = false }: { viewer: Viewer; workflows?: boolean }) {
  const pathname = usePathname()
  const areas = studentNavFor({ workflows })
  return (
    <aside className="glass-strong sticky top-[var(--sim-h,0px)] hidden h-[calc(100dvh-var(--sim-h,0px))] w-64 shrink-0 flex-col border-r lg:flex">
      <div className="px-7 pt-8 pb-10">
        <Logo />
        <p className="eyebrow mt-4">Portal do Aluno</p>
      </div>
      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-4">
        <ul className="space-y-1">
          {areas.map((area) => {
            const active = isActive(pathname, area.match)
            return (
              <li key={area.key}>
                <Link
                  href={area.href}
                  aria-current={active && !area.children ? 'page' : undefined}
                  className={cn(
                    'relative flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px] transition-colors',
                    active ? 'bg-white/[0.06] font-semibold text-ink' : 'text-muted hover:bg-white/[0.04] hover:text-ink',
                  )}
                >
                  {active ? <span className="absolute top-1/2 -left-4 h-5 w-[3px] -translate-y-1/2 rounded-r bg-brand shadow-[0_0_12px_var(--brand-glow)]" /> : null}
                  <NavIcon name={area.icon} />
                  {area.label}
                </Link>
                {area.children && area.children.length > 1 ? (
                  <ul className="mb-2 ml-[2.6rem] border-l border-rule">
                    {area.children.map((child) => {
                      const childActive = isActive(pathname, child.match)
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            aria-current={childActive ? 'page' : undefined}
                            className={cn(
                              '-ml-px block border-l py-1.5 pl-3 text-[13px] transition-colors',
                              childActive ? 'border-signal font-semibold text-ink' : 'border-transparent text-muted hover:text-ink',
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
              </li>
            )
          })}
        </ul>
      </nav>
      <Link
        href={profileNav.href}
        className={cn(
          'glass glass-interactive m-4 flex items-center gap-3 rounded-2xl p-3',
          isActive(pathname, profileNav.match) && 'is-selected',
        )}
      >
        <span className="num flex size-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-on-ink">
          {viewer.initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{viewer.name}</span>
          <span className="block text-xs text-muted">{viewer.cohort ? `${viewer.cohort} · ` : ''}Perfil</span>
        </span>
      </Link>
    </aside>
  )
}

/** Cabeçalho compacto (celular e tablet). */
export function StudentTopBar({ viewer }: { viewer: Viewer }) {
  const pathname = usePathname()
  return (
    <header className="glass-strong sticky top-[var(--sim-h,0px)] z-30 flex h-14 items-center justify-between border-b px-4 lg:hidden">
      <Logo variant="short" />
      <Link
        href={profileNav.href}
        aria-label="Perfil"
        aria-current={isActive(pathname, profileNav.match) ? 'page' : undefined}
        className="num flex size-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-on-ink"
      >
        {viewer.initials}
      </Link>
    </header>
  )
}

/** Barra inferior com as áreas principais (celular e tablet). */
export function StudentBottomNav({ workflows = false }: { workflows?: boolean }) {
  const pathname = usePathname()
  const areas = studentNavFor({ workflows })
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 lg:hidden"
    >
      <ul className={cn('glass glass-strong mx-auto grid max-w-lg rounded-[22px] px-1', areas.length === 4 ? 'grid-cols-4' : 'grid-cols-5')}>
        {areas.map((area) => {
          const active = isActive(pathname, area.match)
          return (
            <li key={area.key}>
              <Link
                href={area.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] tracking-wide transition-colors',
                  active ? 'font-semibold text-ink' : 'text-faint hover:text-ink-2',
                )}
              >
                {active ? <span className="glow-dot absolute bottom-1.5 !size-1" /> : null}
                <NavIcon name={area.icon} size={22} />
                {area.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * Celular e tablet: a barra inferior mostra só as áreas. Dentro da Clínica, uma linha discreta leva às páginas da área
 * (Meus casos · Minha produção · Workflows clínicos) — no desktop isso já está na barra lateral.
 */
export function AreaSubNav({ workflows = false }: { workflows?: boolean }) {
  const pathname = usePathname()
  const area = studentNavFor({ workflows }).find((a) => a.key === 'clinica')
  // Liga junto com a Etapa 9 (banco antigo: telas da Clínica exatamente como hoje).
  if (!workflows || !area?.children || area.children.length < 2 || !isActive(pathname, area.match)) return null
  return (
    <nav aria-label={area.label} className="-mt-1 mb-5 flex flex-wrap gap-x-5 gap-y-1 text-sm lg:hidden" data-subnav={area.key}>
      {area.children.map((child) => {
        const on = isActive(pathname, child.match)
        return (
          <Link
            key={child.href}
            href={child.href}
            aria-current={on ? 'page' : undefined}
            className={cn('inline-flex min-h-11 items-center border-b', on ? 'border-signal font-semibold text-ink' : 'border-transparent text-muted hover:text-ink')}
          >
            {child.label}
          </Link>
        )
      })}
    </nav>
  )
}
