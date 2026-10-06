import type { ReactNode } from 'react'

/** Página/área ainda sem conteúdo: diz o que vai existir ali e quando. */
export function EmptyState({ title, children, stage }: { title: string; children?: ReactNode; stage?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-rule-strong bg-surface px-6 py-10 md:px-10 md:py-14">
      {stage ? <p className="eyebrow text-signal">{stage}</p> : null}
      <p className="mt-2 text-xl font-light tracking-tight">{title}</p>
      {children ? <div className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{children}</div> : null}
    </div>
  )
}
