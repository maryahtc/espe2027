'use client'

import { cn } from '@portal/ui/cn'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isActive, profileNav, studentNav } from '@/config/nav'
import { student } from '@/demo/data'
import { Logo } from './Logo'
import { NavIcon } from './NavIcon'

/** Barra lateral (desktop ≥ 1024 px). */
export function StudentSidebar() {
  const pathname = usePathname()
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-rule bg-surface lg:flex">
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
                    active ? 'font-semibold text-ink' : 'text-ink-2 hover:bg-sunken',
                  )}
                >
                  {active ? <span className="absolute top-2.5 bottom-2.5 -left-4 w-[3px] bg-brand" /> : null}
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
                              childActive ? 'border-ink font-semibold text-ink' : 'border-transparent text-muted hover:text-ink',
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
          'm-4 flex items-center gap-3 rounded-md border border-rule p-3 transition-colors hover:border-rule-strong',
          isActive(pathname, profileNav.match) && 'border-ink',
        )}
      >
        <span className="num flex size-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
          {student.initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{student.name}</span>
          <span className="block text-xs text-muted">{student.cohort} · Perfil</span>
        </span>
      </Link>
    </aside>
  )
}

/** Cabeçalho compacto (celular e tablet). */
export function StudentTopBar() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-surface/95 px-4 backdrop-blur lg:hidden">
      <Logo variant="short" />
      <Link
        href={profileNav.href}
        aria-label="Perfil"
        aria-current={isActive(pathname, profileNav.match) ? 'page' : undefined}
        className="num flex size-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white"
      >
        {student.initials}
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
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {studentNav.map((area) => {
          const active = isActive(pathname, area.match)
          return (
            <li key={area.key}>
              <Link
                href={area.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] tracking-wide',
                  active ? 'font-semibold text-ink' : 'text-muted',
                )}
              >
                {active ? <span className="absolute top-0 h-[2px] w-8 bg-brand" /> : null}
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
