import Link from 'next/link'
import { formatDayMonth, year } from '@/lib/dates'
import { type ContentVM, facultyNames, isReleased, KIND_LABEL, minutes } from '@/lib/library/model'
import { Poster, type PosterData } from './Poster'

export function posterOf(c: ContentVM): PosterData {
  const pending = c.kind === 'video' && !c.videoId
  return {
    slug: c.slug,
    video: c.kind === 'video',
    category: c.category,
    minutes: minutes(c.durationSeconds),
    progress: c.progress ? (c.progress.status === 'concluido' ? 100 : Math.max(c.progress.percent, 4)) : null,
    label: pending ? 'Vídeo em preparação' : null,
  }
}

export function releaseLabel(c: ContentVM): string | null {
  if (isReleased(c) || !c.availableFrom) return null
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(c.availableFrom))
  return `Libera em ${formatDayMonth(d)}/${year(d)}`
}

/** Item da grade da biblioteca: capa, tipo, área, título, professores, temas e situação. */
export function ContentCard({ c, href = `/biblioteca/${c.slug}` }: { c: ContentVM; href?: string }) {
  const release = releaseLabel(c)
  const mins = minutes(c.durationSeconds)
  return (
    <Link href={href} className="group block">
      <Poster item={posterOf(c)} />
      <span className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted">
        <span className="font-semibold tracking-wide text-ink-2 uppercase">{KIND_LABEL[c.kind]}</span>
        <span>·</span>
        <span>{c.category}</span>
        {c.progress?.status === 'concluido' ? <span className="font-semibold text-ink">· ✓ Concluído</span> : null}
        {c.progress?.status === 'iniciado' ? <span>· Em andamento</span> : null}
        {release ? <span className="font-semibold text-signal">· {release}</span> : null}
      </span>
      <span className="mt-1 block text-[15px] leading-snug font-semibold group-hover:underline">{c.title}</span>
      {c.faculty.length || mins ? (
        <span className="mt-0.5 block text-sm text-muted">
          {facultyNames(c.faculty)}
          {c.faculty.length && mins ? ' · ' : ''}
          {mins ? <span className="num">{mins} min</span> : null}
        </span>
      ) : null}
      {c.topics.length ? (
        <span className="mt-2 flex flex-wrap gap-1.5">
          {c.topics.map((t) => (
            <span key={t.id} className="rounded-full border border-rule px-2 py-0.5 text-[11px] text-muted">
              {t.name}
            </span>
          ))}
        </span>
      ) : null}
    </Link>
  )
}

export function ContentGrid({ items }: { items: ContentVM[] }) {
  return (
    <ul className="mt-3 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <li key={c.id}>
          <ContentCard c={c} />
        </li>
      ))}
    </ul>
  )
}
