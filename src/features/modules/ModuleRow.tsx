import Link from 'next/link'
import { PendingTag } from '@/components/ui/StatusBadge'
import { ArrowRight } from '@/components/ui/icons'
import { moduleHref, moduleWhen } from '@/lib/domain/selectors'
import type { PublicModule, PublicProfessor } from '@/schemas/public'
import type { ReactNode } from 'react'

/** Linha de módulo usada na Home, no Cronograma e na página do professor. */
export function ModuleRow({
  module,
  professors,
  href = moduleHref(module),
  muted = false,
  current = false,
  children,
}: {
  module: PublicModule
  professors: PublicProfessor[]
  href?: string
  muted?: boolean
  current?: boolean
  children?: ReactNode
}) {
  return (
    <article className={`group relative border-t border-rule ${muted ? 'opacity-60' : ''}`}>
      <div className="grid grid-cols-[3.25rem_1fr_auto] gap-x-3 py-5 md:grid-cols-[5rem_1fr_auto] md:gap-x-6">
        <span className="font-display text-[2.1rem] leading-none text-ink md:text-5xl" aria-hidden>
          {module.slug}
        </span>
        <div className="min-w-0">
          <p className="data text-[13px] font-medium tracking-wide text-ink uppercase">
            {moduleWhen(module)}
            {current ? <span className="ml-2 rounded-full bg-ink px-2 py-0.5 align-middle text-[10px] tracking-widest text-paper">AGORA</span> : null}
            {module.status === 'a-confirmar' ? <span className="ml-2 align-middle normal-case"><PendingTag /></span> : null}
          </p>
          <h3 className="mt-1 font-display text-[1.45rem] leading-tight text-balance md:text-[1.7rem]">
            <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:outline-2 after:focus-visible:outline-ink">
              <span className="sr-only">Módulo {module.slug}: </span>
              {module.title ?? <span className="text-muted">Tema a definir</span>}
            </Link>
          </h3>
          {professors.length ? (
            <p className="mt-1.5 text-sm text-muted">{professors.map((p) => p.name).join(' · ')}</p>
          ) : null}
        </div>
        <ArrowRight
          className="mt-1 text-faint transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-ink"
          width={18}
          height={18}
        />
        {children ? <div className="relative z-10 col-span-3 mt-4 md:col-span-1 md:col-start-2">{children}</div> : null}
      </div>
    </article>
  )
}
