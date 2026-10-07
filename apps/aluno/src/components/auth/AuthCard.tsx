import { cn } from '@portal/ui/cn'
import type { ReactNode } from 'react'

/** Painel das telas de entrada: mesmo vidro, título leve e filete vermelho do restante do portal. */
export function AuthCard({
  eyebrow,
  title,
  lead,
  wide = false,
  children,
}: {
  eyebrow: string
  title: ReactNode
  lead?: ReactNode
  wide?: boolean
  children: ReactNode
}) {
  return (
    <section className={cn('glass glass-sheen reveal mx-auto rounded-[22px] p-7 sm:p-9', wide ? 'max-w-[600px]' : 'max-w-[440px]')}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-3xl leading-[1.1] font-light tracking-tight">{title}</h1>
      <div className="rule-brand mt-3 w-16" />
      {lead ? <div className="mt-4 text-[15px] leading-relaxed text-muted">{lead}</div> : null}
      <div className="mt-7">{children}</div>
    </section>
  )
}
