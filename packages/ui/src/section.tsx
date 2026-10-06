import type { ReactNode } from 'react'
import { cn } from './cn'

/**
 * Cabeçalho de seção no estilo do manual: número em vermelho, título leve e filete vermelho curto.
 *   01
 *   preparação ───
 */
export function SectionHeader({
  index,
  title,
  aside,
  className,
}: {
  index?: string
  title: ReactNode
  aside?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div>
        {index ? <span className="num block text-sm font-semibold text-signal">{index}</span> : null}
        <h2 className="text-xl leading-tight font-light tracking-tight text-ink md:text-2xl">{title}</h2>
        <div className="rule-brand mt-2 w-16" />
      </div>
      {aside ? <div className="shrink-0 pb-1 text-sm">{aside}</div> : null}
    </div>
  )
}

/** Título de página: rótulo pequeno + título grande e leve. */
export function PageTitle({ eyebrow, title, lead }: { eyebrow?: string; title: ReactNode; lead?: ReactNode }) {
  return (
    <header className="pt-2 pb-8 md:pt-6 md:pb-10">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="mt-2 text-3xl leading-[1.1] font-light tracking-tight md:text-[2.75rem]">{title}</h1>
      {lead ? <p className="mt-3 max-w-2xl text-base text-muted">{lead}</p> : null}
    </header>
  )
}
