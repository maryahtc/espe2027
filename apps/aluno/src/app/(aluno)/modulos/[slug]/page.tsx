import { IconArrowRight } from '@portal/ui/icons'
import { EmptyState } from '@portal/ui/empty-state'
import { Chip } from '@portal/ui/tag'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ContentRow, sortPreparation } from '@/components/content/ContentRow'
import { DEMO_TODAY, moduleBySlug, modules, nextModule, nextModuleDetail, nextModuleSchedule, preparation } from '@/demo/data'
import { formatRange, monthLong, relativeDays, weekday, day } from '@/lib/dates'

export function generateStaticParams() {
  return modules.map((m) => ({ slug: m.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const m = moduleBySlug((await params).slug)
  return { title: m ? `Módulo ${m.slug} · ${m.title}` : 'Módulo' }
}

const SECTIONS = [
  { id: 'programacao', label: 'Programação' },
  { id: 'antes', label: 'Antes do módulo' },
  { id: 'durante', label: 'Durante e depois' },
  { id: 'docentes', label: 'Docentes' },
]

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const m = moduleBySlug((await params).slug)
  if (!m) notFound()
  const isNext = m.number === nextModule.number
  const idx = modules.indexOf(m)
  const prev = modules[idx - 1]
  const next = modules[idx + 1]

  return (
    <article>
      <Link href="/cronograma" className="text-sm text-muted hover:text-ink">
        ← Cronograma
      </Link>

      <header className="mt-6 flex items-start gap-5 sm:gap-8">
        <div
          aria-hidden="true"
          className={`num flex size-[76px] shrink-0 items-center justify-center text-[40px] font-light sm:size-28 sm:text-6xl ${isNext ? 'bg-brand text-white' : 'border border-rule-strong bg-surface text-ink'}`}
        >
          {m.slug}
        </div>
        <div className="min-w-0">
          <p className="eyebrow">
            Módulo {m.slug}
            {m.state === 'done' ? ' · concluído' : isNext ? ` · ${relativeDays(DEMO_TODAY, m.start)}` : ` · ${monthLong(m.start)}`}
          </p>
          <h1 className="mt-1 text-3xl leading-[1.05] font-light tracking-tight sm:text-5xl">{m.title}</h1>
          <p className="num mt-3 text-lg">
            {formatRange(m.start, m.end)}{' '}
            <span className="font-sans text-sm text-muted">
              {weekday(m.start)} a {weekday(m.end)}
            </span>
          </p>
        </div>
      </header>

      {isNext ? <p className="mt-6 max-w-[65ch] text-[15px] leading-relaxed text-ink-2">{nextModuleDetail.description}</p> : null}

      <nav aria-label="Seções do módulo" className="sticky top-14 z-20 -mx-4 mt-8 overflow-x-auto border-b border-rule bg-paper/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:mx-0 lg:px-0">
        <ul className="flex gap-6 whitespace-nowrap">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className={`block border-b-2 py-3 text-sm ${i === 0 ? 'border-ink font-semibold' : 'border-transparent text-muted hover:text-ink'}`}>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 space-y-14">
        <section id="programacao" aria-labelledby="programacao-t" className="scroll-mt-28">
          <h2 id="programacao-t" className="text-2xl font-light tracking-tight">Programação</h2>
          <div className="rule-brand mt-2 w-12" />
          {isNext ? (
            <div className="mt-6 space-y-8">
              {nextModuleSchedule.map((d) => (
                <div key={d.date} className="grid gap-3 md:grid-cols-[9rem_1fr] md:gap-8">
                  <p className="pt-3">
                    <span className="eyebrow block">{weekday(d.date)}</span>
                    <span className="num text-3xl font-light">{day(d.date)}</span>
                    <span className="text-sm text-muted"> {monthLong(d.date)}</span>
                  </p>
                  <ol className="divide-y divide-rule border-y border-rule">
                    {d.items.map((it) => (
                      <li key={it.title} className="grid grid-cols-[5.5rem_1fr] gap-4 py-4 sm:grid-cols-[7rem_1fr_auto]">
                        <span className="num text-sm text-ink-2">
                          {it.start}–{it.end}
                        </span>
                        <span>
                          <span className="block text-[15px] leading-snug font-semibold">{it.title}</span>
                          <span className="block text-xs text-muted">{it.teacher.name}</span>
                        </span>
                        <span className="col-start-2 sm:col-start-auto">
                          <Chip>{it.type}</Chip>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState title={m.state === 'done' ? 'Programação arquivada' : 'Programação ainda não publicada'}>
                {m.state === 'done'
                  ? 'Na versão real, a programação do módulo fica disponível aqui para consulta.'
                  : 'A coordenação publica a programação dia a dia antes do módulo. Você verá horários, docentes e tipo de atividade.'}
              </EmptyState>
            </div>
          )}
        </section>

        <section id="antes" aria-labelledby="antes-t" className="scroll-mt-28">
          <h2 id="antes-t" className="text-2xl font-light tracking-tight">Antes do módulo</h2>
          <div className="rule-brand mt-2 w-12" />
          {isNext ? (
            <ul className="mt-4 divide-y divide-rule">
              {sortPreparation(preparation).map((p) => (
                <ContentRow key={p.id} item={p} />
              ))}
            </ul>
          ) : (
            <div className="mt-6">
              <EmptyState title="Sem preparação cadastrada">
                Artigos, capítulos e aulas gravadas indicados pela coordenação, marcados como obrigatório, recomendado ou
                complementar.
              </EmptyState>
            </div>
          )}
        </section>

        <section id="durante" aria-labelledby="durante-t" className="scroll-mt-28">
          <h2 id="durante-t" className="text-2xl font-light tracking-tight">Durante e depois</h2>
          <div className="rule-brand mt-2 w-12" />
          <div className="mt-6">
            <EmptyState title={m.state === 'done' ? 'Materiais do módulo' : 'Disponível a partir do módulo'}>
              Slides, PDFs, artigos, gravações das aulas e referências — tudo vindo da biblioteca.
            </EmptyState>
          </div>
        </section>

        <section id="docentes" aria-labelledby="docentes-t" className="scroll-mt-28">
          <h2 id="docentes-t" className="text-2xl font-light tracking-tight">Docentes</h2>
          <div className="rule-brand mt-2 w-12" />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {m.teachers.map((t) => (
              <li key={t.slug} className="flex items-center gap-3 rounded-md border border-rule bg-surface p-4">
                <span className="num flex size-10 items-center justify-center rounded-full bg-sunken text-sm font-semibold">
                  {t.short
                    .split(' ')
                    .map((w) => w[0])
                    .join('')}
                </span>
                <span className="text-sm font-semibold">{t.name}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <nav aria-label="Outros módulos" className="mt-16 grid grid-cols-2 gap-4 border-t border-rule pt-6 text-sm">
        {prev ? (
          <Link href={`/modulos/${prev.slug}`} className="group">
            <span className="eyebrow block">← Módulo {prev.slug}</span>
            <span className="mt-1 block font-semibold group-hover:underline">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/modulos/${next.slug}`} className="group text-right">
            <span className="eyebrow inline-flex items-center gap-1">
              Módulo {next.slug} <IconArrowRight size={12} />
            </span>
            <span className="mt-1 block font-semibold group-hover:underline">{next.title}</span>
          </Link>
        ) : null}
      </nav>
    </article>
  )
}
