import Link from 'next/link'
import { operationsNav, primaryNav } from '@/config/nav'
import { siteConfig } from '@/config/site'
import { CloseIcon, MenuIcon, SearchIcon } from '@/components/ui/icons'

const desktopLink =
  'relative py-1 text-sm text-muted transition-colors hover:text-ink aria-[current=page]:text-ink aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:-bottom-[17px] aria-[current=page]:after:h-px aria-[current=page]:after:bg-ink'

/** Cabeçalho. Item ativo e menu do celular são ativados por src/client/chrome.ts. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between gap-6 px-4 md:px-8">
        <Link href="/" className="flex items-baseline gap-2" aria-label={`${siteConfig.name} — início`}>
          <span className="font-display text-[1.35rem] leading-none tracking-tight">{siteConfig.shortName}</span>
          <span className="data hidden text-[11px] text-faint sm:inline">Odontologia</span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
          {primaryNav.map((item) => (
            <Link key={item.href} href={item.href} data-nav="" className={desktopLink}>
              {item.label}
            </Link>
          ))}
          <span className="h-4 w-px bg-rule-strong" aria-hidden />
          {operationsNav.map((item) => (
            <Link key={item.href} href={item.href} data-nav="" className={desktopLink}>
              {item.label}
            </Link>
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
            data-menu-open=""
            className="inline-flex h-11 items-center gap-2 rounded-md px-2 text-sm font-medium transition-colors hover:bg-rule/60 md:hidden"
            aria-haspopup="dialog"
          >
            <MenuIcon />
            Menu
          </button>
        </div>
      </div>

      <dialog
        data-menu=""
        aria-label="Menu"
        className="m-0 h-dvh max-h-none w-full max-w-none bg-paper p-0 text-ink backdrop:bg-ink/20 open:animate-rise"
      >
        <div className="flex h-14 items-center justify-between border-b border-rule px-4">
          <span className="font-display text-[1.35rem] leading-none">{siteConfig.shortName}</span>
          <button
            type="button"
            data-menu-close=""
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
                  data-nav=""
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
                <Link href={item.href} data-nav="" className="flex min-h-12 items-center text-base aria-[current=page]:font-semibold">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/busca" className="mt-8 flex min-h-12 items-center gap-3 rounded-md border border-rule-strong px-4 text-muted">
            <SearchIcon />
            Professor, módulo, tema, material…
          </Link>
        </nav>
      </dialog>
    </header>
  )
}
