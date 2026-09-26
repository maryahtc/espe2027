import Link from 'next/link'
import { formatDayMonth } from '@/lib/dates'
import { professorHref } from '@/lib/domain/selectors'
import type { PublicClass, PublicProfessor } from '@/schemas/public'

/** Cartão discreto: nome, especialidade e participação no módulo. */
export function ProfessorCard({ professor, classes }: { professor: PublicProfessor; classes: PublicClass[] }) {
  return (
    <li className="group relative rounded-lg border border-rule bg-surface p-4 transition-colors hover:border-rule-strong">
      <h3 className="text-[16px] font-semibold text-ink">
        <Link href={professorHref(professor.slug)} className="after:absolute after:inset-0">
          {professor.name}
        </Link>
      </h3>
      {professor.specialty ? <p className="text-sm text-muted">{professor.specialty}</p> : null}
      {classes.length ? (
        <ul className="mt-3 space-y-1 border-t border-rule pt-3 text-[13px] text-ink-2">
          {classes.map((c) => (
            <li key={c.id} className="flex gap-2">
              <span className="data w-14 shrink-0 text-muted">{c.date ? formatDayMonth(c.date) : `Dia ${c.day ?? '—'}`}</span>
              <span className="min-w-0">{c.title}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}
