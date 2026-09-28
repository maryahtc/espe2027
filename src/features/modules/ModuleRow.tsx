import Link from 'next/link'
import type { ReactNode } from 'react'
import { PendingTag } from '@/components/ui/StatusBadge'
import { ArrowRight } from '@/components/ui/icons'
import { moduleDatesPending, moduleHref, moduleWhen } from '@/lib/domain/selectors'
import type { PublicModule, PublicProfessor } from '@/schemas/public'

/** Selos de "a confirmar" de um módulo: nunca corrigimos, só sinalizamos. */
export function ModuleNotices({ module }: { module: PublicModule }) {
  const tags: string[] = []
  if (module.notices.includes('numero-repetido')) tags.push('Numeração a confirmar')
  if (moduleDatesPending(module)) tags.push('Datas a confirmar')
  else if (module.status === 'a-confirmar') tags.push('A confirmar')
  if (!tags.length) return null
  return (
    <span className="inline-flex flex-wrap gap-1.5 align-middle normal-case">
      {tags.map((t) => (
        <PendingTag key={t}>{t}</PendingTag>
      ))}
    </span>
  )
}

/** Linha de módulo usada na Home, no Cronograma e na página do professor. */
export function ModuleRow({
  module,
  professors,
  href = moduleHref(module),
  past = false,
  current = false,
  carry,
  itemProps,
  children,
}: {
  module: PublicModule
  professors: PublicProfessor[]
  href?: string
  past?: boolean
  current?: boolean
  /** Parâmetro de filtro que o link leva adiante (ex.: professor). */
  carry?: string
  itemProps?: Record<string, string>
  children?: ReactNode
}) {
  return (
    <article className="group relative border-t border-rule" data-past={past || undefined} {...itemProps}>
      <div className="grid grid-cols-[3.25rem_1fr_auto] gap-x-3 py-5 md:grid-cols-[5rem_1fr_auto] md:gap-x-6">
        <span className="font-display text-[2.1rem] leading-none text-ink md:text-5xl" aria-hidden>
          {String(module.number).padStart(2, '0')}
        </span>
        <div className="min-w-0">
          <p className="data flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium tracking-wide text-ink uppercase">
            <span>{moduleWhen(module)}</span>
            {current ? <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] tracking-widest text-paper">AGORA</span> : null}
            <ModuleNotices module={module} />
          </p>
          <h3 className="mt-1 font-display text-[1.45rem] leading-tight text-balance md:text-[1.7rem]">
            <Link
              href={href}
              {...(carry ? { 'data-carry': carry } : {})}
              className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:outline-2 after:focus-visible:outline-ink"
            >
              <span className="sr-only">Módulo {module.slug}: </span>
              {module.title ?? <span className="text-muted">Tema a confirmar</span>}
            </Link>
          </h3>
          {professors.length ? <p className="mt-1.5 text-sm text-muted">{professors.map((p) => p.name).join(' · ')}</p> : null}
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
