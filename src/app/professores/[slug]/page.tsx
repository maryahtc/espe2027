import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ButtonLink } from '@/components/ui/ArrowLink'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/PageHeader'
import { PendingTag } from '@/components/ui/StatusBadge'
import { TypeTag } from '@/components/ui/TypeTag'
import { ArrowLeft } from '@/components/ui/icons'
import { PERIODS } from '@/config/vocab'
import { ModuleNotices, ModuleRow } from '@/features/modules/ModuleRow'
import { formatDayMonth, formatTimeRange, todayISO, weekdayOf } from '@/lib/dates'
import {
  getProfessorParticipations,
  moduleHref,
  moduleLabel,
  moduleTiming,
  moduleWhen,
  professorNames,
  type ProfessorParticipation,
} from '@/lib/domain/selectors'
import type { PublicClass } from '@/schemas/public'
import { getDataset } from '@/server/data/repository'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const ds = await getDataset()
  return ds.professors.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const professor = (await getDataset()).professors.find((p) => p.slug === slug)
  return { title: professor ? professor.name : 'Professor não encontrado' }
}

function classWhen(c: PublicClass): string {
  const time = formatTimeRange(c.start, c.end) ?? (c.period ? PERIODS[c.period].label : null)
  return time ?? 'Horário a confirmar'
}

function ClassLine({ item }: { item: PublicClass }) {
  return (
    <li className="grid grid-cols-[4.75rem_1fr] gap-x-4 border-t border-rule py-3 first:border-t-0 md:grid-cols-[7rem_1fr]">
      <div>
        <p className="data text-[15px] font-medium text-ink">{item.date ? formatDayMonth(item.date) : `Dia ${item.day ?? '—'}`}</p>
        <p className="text-xs text-muted">
          {item.date ? (item.notices.length ? item.date.slice(0, 4) : weekdayOf(item.date)) : 'data a confirmar'}
        </p>
      </div>
      <div className="min-w-0">
        <p className="data text-[15px] text-ink">{classWhen(item)}</p>
        <p className="mt-0.5 text-[17px] leading-snug font-semibold">{item.title}</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <TypeTag type={item.type} />
          {item.status === 'a-confirmar' ? <PendingTag /> : null}
          {item.notices.includes('data-inconsistente') ? <PendingTag>Data a confirmar</PendingTag> : null}
        </div>
      </div>
    </li>
  )
}

function fullModuleHref(p: ProfessorParticipation, slug: string) {
  return `${moduleHref(p.module)}?professor=${slug}#${p.classes[0]!.id}`
}

export default async function ProfessorPage({ params }: Props) {
  const { slug } = await params
  const ds = await getDataset()
  const professor = ds.professors.find((p) => p.slug === slug)
  if (!professor) notFound()

  const today = todayISO()
  const { upcoming, past } = getProfessorParticipations(ds, slug, today)
  const [first, ...others] = upcoming

  return (
    <>
      <div className="pt-6">
        <Link href="/professores" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft width={15} height={15} /> Professores
        </Link>
      </div>
      <header className="animate-rise pt-2 pb-8 md:pt-6 md:pb-12">
        <p className="label mb-2">Prof.</p>
        <h1 className="font-display text-[2.75rem] leading-[1.02] text-balance md:text-7xl">{professor.name}</h1>
        {professor.specialty ? <p className="mt-2 text-lg text-ink-2">{professor.specialty}</p> : null}
        {professor.bio ? <p className="mt-4 max-w-2xl text-[15px] text-muted">{professor.bio}</p> : null}
      </header>

      <section aria-label="Suas participações" className="mb-14">
        <SectionHeader title="Suas participações" />
        {first ? (
          <div className="animate-rise overflow-hidden rounded-xl border border-rule-strong bg-surface">
            <div className="ruler" aria-hidden />
            <div className="p-5 md:p-8">
              <p className="label">{moduleTiming(first.module, today) === 'current' ? 'Acontecendo agora' : 'Próxima participação'}</p>
              <div className="mt-3 flex items-baseline gap-4">
                <span className="font-display text-6xl leading-none md:text-7xl" aria-hidden>
                  {String(first.module.number).padStart(2, '0')}
                </span>
                <div>
                  <p className="label !text-ink">{moduleLabel(first.module)}</p>
                  <p className="data mt-1 font-medium tracking-wide uppercase">{moduleWhen(first.module)}</p>
                  <div className="mt-1.5 empty:hidden"><ModuleNotices module={first.module} /></div>
                </div>
              </div>
              <p className="mt-3 font-display text-3xl leading-tight md:text-4xl">{first.module.title ?? 'Tema a confirmar'}</p>

              <p className="label mt-7 mb-1 !text-ink">{first.classes.length > 1 ? 'Suas aulas' : 'Sua aula'}</p>
              <ol>
                {first.classes.map((c) => (
                  <ClassLine key={c.id} item={c} />
                ))}
              </ol>
              <div className="mt-6">
                <ButtonLink href={fullModuleHref(first, slug)}>Ver módulo completo</ButtonLink>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="Nenhuma participação futura cadastrada." />
        )}

        {others.length ? (
          <div className="mt-10">
            <p className="label mb-1">Depois</p>
            {others.map((p) => (
              <ModuleRow key={p.module.slug} module={p.module} professors={professorNames(ds, p.module.professorSlugs)} href={fullModuleHref(p, slug)}>
                <ol className="rounded-md border border-rule bg-surface px-3">
                  {p.classes.map((c) => (
                    <ClassLine key={c.id} item={c} />
                  ))}
                </ol>
              </ModuleRow>
            ))}
          </div>
        ) : null}
      </section>

      {past.length ? (
        <details className="group mb-10 border-t border-ink pt-2">
          <summary className="label flex min-h-11 cursor-pointer list-none items-center justify-between !text-ink">
            Participações anteriores ({past.length})
            <span className="text-base transition-transform group-open:rotate-45" aria-hidden>
              +
            </span>
          </summary>
          <div className="mt-2">
            {past.map((p) => (
              <ModuleRow key={p.module.slug} module={p.module} professors={[]} href={fullModuleHref(p, slug)}>
                <p className="text-sm text-muted">{p.classes.map((c) => c.title).join(' · ')}</p>
              </ModuleRow>
            ))}
          </div>
        </details>
      ) : null}
    </>
  )
}
