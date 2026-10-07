'use client'

import { cn } from '@portal/ui/cn'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { adminGroups } from '@/config/nav'
import { Logo } from './Logo'
import { NavIcon } from './NavIcon'

function useActive() {
  const pathname = usePathname()
  return (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`))
}

function NavList({ onDark = false }: { onDark?: boolean }) {
  const active = useActive()
  return (
    <>
      <Link
        href="/admin"
        className={cn(
          'flex min-h-10 items-center gap-3 rounded-md px-3 text-sm',
          active('/admin') ? 'bg-white/[0.07] font-semibold text-ink' : 'text-muted hover:bg-white/[0.04] hover:text-ink',
        )}
      >
        <NavIcon name="home" size={18} /> Início do painel
      </Link>
      {adminGroups.map((group) => (
        <div key={group.label} className="mt-5">
          <p className={cn('eyebrow px-3 text-[10px]', onDark && 'text-faint')}>{group.label}</p>
          <ul className="mt-1.5 space-y-0.5">
            {group.sections.map((s) => {
              const href = `/admin/${s.slug}`
              const on = active(href)
              return (
                <li key={s.slug}>
                  <Link
                    href={href}
                    aria-current={on ? 'page' : undefined}
                    className={cn(
                      'relative flex min-h-10 items-center gap-3 rounded-md px-3 text-sm',
                      on ? 'bg-white/[0.07] font-semibold text-ink' : 'text-muted hover:bg-white/[0.04] hover:text-ink',
                    )}
                  >
                    {on ? <span className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r bg-brand" /> : null}
                    <NavIcon name={s.icon} size={18} />
                    {s.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </>
  )
}

export function AdminSidebar() {
  return (
    <aside className="glass-strong sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r lg:flex">
      <div className="px-6 pt-7 pb-6">
        <Logo href="/admin" />
        <p className="eyebrow mt-4 text-signal">Administração</p>
      </div>
      <nav aria-label="Administração" className="flex-1 overflow-y-auto px-3 pb-6">
        <NavList />
      </nav>
      <Link href="/" className="glass glass-interactive mx-3 mt-3 rounded-full p-3 text-center text-sm font-semibold">
        Ver portal como aluno →
      </Link>
      <SignOutButton className="px-3 pt-1 pb-3 text-center" quiet />
    </aside>
  )
}

/** Celular: cabeçalho com menu recolhível (sem JavaScript: <details>). */
export function AdminTopBar() {
  return (
    <header className="glass-strong sticky top-0 z-30 border-b lg:hidden">
      <details className="group">
        <summary className="flex h-14 cursor-pointer list-none items-center justify-between px-4 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-3">
            <Logo variant="short" href="/admin" />
            <span className="eyebrow text-signal">Admin</span>
          </span>
          <span className="glass rounded-full px-3.5 py-1.5 text-sm font-semibold">
            <span className="group-open:hidden">Menu</span>
            <span className="hidden group-open:inline">Fechar</span>
          </span>
        </summary>
        <nav aria-label="Administração" className="max-h-[75dvh] overflow-y-auto border-t border-rule px-3 pt-3 pb-5">
          <NavList />
          <Link href="/" className="mt-5 block rounded-md border border-rule p-3 text-center text-sm font-semibold">
            Ver portal como aluno →
          </Link>
          <SignOutButton className="mt-2 text-center" quiet />
        </nav>
      </details>
    </header>
  )
}
