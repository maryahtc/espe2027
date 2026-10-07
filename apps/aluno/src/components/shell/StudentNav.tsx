'use client'

import { cn } from '@portal/ui/cn'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isActive, profileNav, studentNav } from '@/config/nav'
import { Logo } from './Logo'
import { NavIcon } from './NavIcon'

/** Barra lateral (desktop ≥ 1024 px). */
/** Quem está logado (nome, iniciais e turma) — vem do layout, lido no servidor. */
export type Viewer = { name: string; initials: string; cohort: string }

export function StudentSidebar({ viewer }: { viewer: Viewer }) {
  const pathname = usePathname()
  return (
    <aside className="glass-strong sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r lg:flex">
      <div className="px-7 pt-8 pb-10">
        <Logo />
        <p className="eyebrow mt-4">Portal do Aluno</p>
      </div>
      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-4">
        <ul className="space-y-1">
          {studentNav.map((area) => {
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
    <header className="glass-strong sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 lg:hidden">
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

/** Barra inferior com as 5 áreas (celular e tablet). */
export function StudentBottomNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 lg:hidden"
    >
      <ul className="glass glass-strong mx-auto grid max-w-lg grid-cols-5 rounded-[22px] px-1">
        {studentNav.map((area) => {
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
