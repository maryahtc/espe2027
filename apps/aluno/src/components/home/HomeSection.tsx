import type { ReactNode } from 'react'

/**
 * Seção editorial da Home: rótulo à esquerda (número vermelho + título leve + filete),
 * conteúdo à direita. No celular, o rótulo fica acima.
 */
export function HomeSection({
  id,
  index,
  title,
  note,
  children,
}: {
  id: string
  index: string
  title: string
  note?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="grid gap-5 border-t border-rule pt-8 lg:grid-cols-12 lg:gap-10 lg:pt-12">
      <header className="lg:col-span-3">
        <span className="num block text-sm font-semibold text-brand">{index}</span>
        <h2 id={`${id}-titulo`} className="text-2xl leading-tight font-light tracking-tight">
          {title}
        </h2>
        <div className="rule-brand mt-2 w-12" />
        {note ? <div className="mt-3 text-sm text-muted">{note}</div> : null}
      </header>
      <div className="min-w-0 lg:col-span-9">{children}</div>
    </section>
  )
}
