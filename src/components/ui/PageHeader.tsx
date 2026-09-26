import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="pt-8 pb-6 md:pt-14 md:pb-8">
      {eyebrow ? <div className="label mb-3">{eyebrow}</div> : null}
      <h1 className="font-display text-[2.5rem] leading-[1.05] tracking-[-0.01em] text-balance md:text-6xl">{title}</h1>
      {description ? <p className="mt-3 max-w-2xl text-[15px] text-muted md:text-base">{description}</p> : null}
      {children}
    </header>
  )
}

export function SectionHeader({ id, title, action, count }: { id?: string; title: string; action?: ReactNode; count?: number }) {
  return (
    <div id={id} className="mb-4 flex items-end justify-between gap-4 border-b border-ink pb-2">
      <h2 className="label !text-ink">
        {title}
        {count !== undefined ? <span className="data ml-2 font-normal text-muted">{count}</span> : null}
      </h2>
      {action}
    </div>
  )
}
