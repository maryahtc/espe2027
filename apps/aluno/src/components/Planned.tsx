import { EmptyState } from '@portal/ui/empty-state'
import { PageTitle } from '@portal/ui/section'

/** Página que já existe na navegação, mas cujo conteúdo chega numa etapa posterior. */
export function Planned({
  eyebrow,
  title,
  lead,
  stage,
  items,
}: {
  eyebrow: string
  title: string
  lead: string
  stage: string
  items: string[]
}) {
  return (
    <>
      <PageTitle eyebrow={eyebrow} title={title} lead={lead} />
      <EmptyState stage={stage} title="O que vai existir aqui">
        <ul className="list-disc space-y-1 pl-5">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </EmptyState>
    </>
  )
}
