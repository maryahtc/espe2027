import Link from 'next/link'
import { PERIODS } from '@/config/vocab'
import { TypeTag } from '@/components/ui/TypeTag'
import { PendingTag } from '@/components/ui/StatusBadge'
import { professorHref, type DayGroup } from '@/lib/domain/selectors'
import type { PublicClass, PublicProfessor } from '@/schemas/public'

function TimeCell({ item }: { item: PublicClass }) {
  if (item.start) {
    return (
      <div className="data text-[15px] leading-tight font-medium text-ink">
        {item.start}
        {item.end ? <span className="block text-[13px] font-normal text-muted">{item.end}</span> : null}
      </div>
    )
  }
  return (
    <div className="data text-[13px] leading-tight text-muted">
      {item.period ? PERIODS[item.period].label : 'Horário'}
      {item.period ? null : <span className="block text-[11px]">a confirmar</span>}
    </div>
  )
}

export function ScheduleItem({
  item,
  professors,
  highlightSlug,
  showModule,
  filterProps,
}: {
  item: PublicClass
  professors: Map<string, PublicProfessor>
  highlightSlug?: string
  showModule?: boolean
  filterProps?: Record<string, string>
}) {
  const people = item.professorSlugs.map((slug) => professors.get(slug)).filter((p): p is PublicProfessor => !!p)
  const highlighted = !!highlightSlug && item.professorSlugs.includes(highlightSlug)
  return (
    <li
      id={item.id}
      data-prof={item.professorSlugs.join(' ')}
      data-highlight={highlighted || undefined}
      {...filterProps}
      className="group grid scroll-mt-28 grid-cols-[4.25rem_1fr] gap-x-4 border-t border-rule py-4 first:border-t-0 data-[highlight]:-mx-3 data-[highlight]:rounded-md data-[highlight]:border-t-transparent data-[highlight]:bg-surface data-[highlight]:px-3 data-[highlight]:shadow-[inset_3px_0_0_var(--ink)] md:grid-cols-[6rem_1fr]"
    >
      <TimeCell item={item} />
      <div className="min-w-0">
        <p className="label mb-1 hidden !text-ink group-data-[highlight]:block">Sua aula</p>
        <h4 className="text-[17px] leading-snug font-semibold text-ink">
          {showModule ? <span className="data mr-2 text-[13px] font-normal text-muted">M{String(item.moduleNumber).padStart(2, '0')}</span> : null}
          {item.title}
        </h4>
        {item.description ? <p className="mt-1 text-sm whitespace-pre-line text-muted">{item.description}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          {people.length ? (
            <p className="text-sm text-ink-2">
              {people.map((p, i) => (
                <span key={p.slug}>
                  {i > 0 ? <span className="text-faint"> · </span> : null}
                  <Link href={professorHref(p.slug)} className="link-underline">
                    {p.name}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
          <TypeTag type={item.type} />
          {item.status === 'a-confirmar' ? <PendingTag /> : null}
          {item.notices.includes('data-inconsistente') ? <PendingTag>Data a confirmar</PendingTag> : null}
        </div>
        {item.publicNotes ? (
          <p className="mt-2 border-l-2 border-rule-strong pl-3 text-sm whitespace-pre-line text-ink-2">{item.publicNotes}</p>
        ) : null}
      </div>
    </li>
  )
}

export function ScheduleDay({
  group,
  professors,
  highlightSlug,
}: {
  group: DayGroup
  professors: Map<string, PublicProfessor>
  highlightSlug?: string
}) {
  return (
    <section aria-label={group.label} className="mb-8">
      <h3 className="label sticky top-14 z-10 -mx-4 bg-paper/95 px-4 py-2 !text-ink backdrop-blur md:mx-0 md:px-0">
        {group.label}
      </h3>
      <ol className="mt-1">
        {group.classes.map((item) => (
          <ScheduleItem key={item.id} item={item} professors={professors} highlightSlug={highlightSlug} />
        ))}
      </ol>
    </section>
  )
}
