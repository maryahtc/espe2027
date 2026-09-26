'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { operationsNav, primaryNav, type NavItem } from '@/config/nav'
import { siteConfig } from '@/config/site'
import { CloseIcon, MenuIcon, SearchIcon } from '@/components/ui/icons'

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}

function DesktopLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href)
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`relative py-1 text-sm transition-colors ${active ? 'text-ink' : 'text-muted hover:text-ink'} ${
        active ? 'after:absolute after:inset-x-0 after:-bottom-[17px] after:h-px after:bg-ink' : ''
      }`}
    >
      {item.label}
    </Link>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Fecha o menu ao navegar.
  useEffect(() => {
    dialogRef.current?.close()
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-6 px-4 md:px-8">
        <Link href="/" className="flex items-baseline gap-2" aria-label={`${siteConfig.name} — início`}>
          <span className="font-display text-[1.35rem] leading-none tracking-tight">{siteConfig.shortName}</span>
          <span className="data hidden text-[11px] text-faint sm:inline">Odontologia</span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
          {primaryNav.map((item) => (
            <DesktopLink key={item.href} item={item} pathname={pathname} />
          ))}
          <span className="h-4 w-px bg-rule-strong" aria-hidden />
          {operationsNav.map((item) => (
            <DesktopLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/busca"
            className="inline-flex size-11 items-center justify-center rounded-md text-ink transition-colors hover:bg-rule/60"
            aria-label="Buscar"
          >
            <SearchIcon />
          </Link>
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="inline-flex h-11 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors hover:bg-rule/60 md:hidden"
            aria-haspopup="dialog"
          >
            <MenuIcon />
            Menu
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-label="Menu"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-paper p-0 text-ink backdrop:bg-ink/20 open:animate-rise"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close()
        }}
      >
        <div className="flex h-14 items-center justify-between border-b border-rule px-4">
          <span className="font-display text-[1.35rem] leading-none">{siteConfig.shortName}</span>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="inline-flex size-11 items-center justify-center rounded-md hover:bg-rule/60"
            aria-label="Fechar menu"
          >
            <CloseIcon />
          </button>
        </div>
        <nav aria-label="Menu" className="px-4 pt-6">
          <ul className="space-y-1">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                  className="flex min-h-12 items-center font-display text-[2rem] leading-tight aria-[current=page]:underline aria-[current=page]:decoration-1 aria-[current=page]:underline-offset-8"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="label mt-10 mb-2">Operação</p>
          <ul className="border-t border-rule">
            {operationsNav.map((item) => (
              <li key={item.href} className="border-b border-rule">
                <Link
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                  className="flex min-h-12 items-center text-base aria-[current=page]:font-semibold"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/busca"
            className="mt-8 flex min-h-12 items-center gap-3 rounded-md border border-rule-strong px-4 text-muted"
          >
            <SearchIcon />
            Professor, módulo, tema, material…
          </Link>
        </nav>
      </dialog>
    </header>
  )
}
