import { ButtonLink } from '@portal/ui/button'
import { IconArrowRight, IconCheck, IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { nextSession, sortedCases } from '@/demo/cases'
import { DEMO_TODAY } from '@/demo/data'
import { formatDayMonth, relativeDays, year } from '@/lib/dates'

export const metadata: Metadata = { title: 'Meus casos' }

const FILTERS = [
  { id: 'f-todos', label: 'Todos' },
  { id: 'f-andamento', label: 'Em andamento' },
  { id: 'f-concluido', label: 'Concluídos' },
]

// Filtro sem JavaScript: rádio + :has().
const filterCss = `
[data-cases]:has(#f-andamento:checked) [data-status="concluido"]{display:none}
[data-cases]:has(#f-concluido:checked) [data-status="andamento"]{display:none}`

export default function CasesPage() {
  const list = sortedCases()
  const count = (s: string) => list.filter((c) => c.status === s).length
  return (
    <div data-cases>
      <style>{filterCss}</style>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle eyebrow="Clínica" title="Meus casos" lead="Pacientes identificados por iniciais. Fotos e planejamento ficam no Smile Cloud." />
        <ButtonLink href="/casos/novo" className="mb-8 md:mb-10">
          <IconPlus size={18} /> Registrar novo caso
        </ButtonLink>
      </div>

      <fieldset>
        <legend className="sr-only">Mostrar</legend>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f, i) => (
            <span key={f.id}>
              <input type="radio" name="filtro" id={f.id} defaultChecked={i === 0} className="peer sr-only" />
              <label
                htmlFor={f.id}
                className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-rule-strong px-3.5 text-sm text-ink-2 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-ink"
              >
                {f.label}
                <span className="num text-xs opacity-70">
                  {i === 0 ? list.length : i === 1 ? count('andamento') : count('concluido')}
                </span>
              </label>
            </span>
          ))}
        </div>
      </fieldset>

      <ul className="mt-6 space-y-3">
        {list.map((c) => {
          const nxt = nextSession(c)
          const done = c.sessions.filter((s) => s.status === 'realizada').length
          return (
            <li key={c.id} data-status={c.status}>
              <Link
                href={`/casos/${c.id}`}
                className="group grid gap-4 rounded-lg border border-rule bg-surface p-5 transition-colors hover:border-ink sm:grid-cols-[6.5rem_1fr_auto] sm:items-center sm:gap-6"
              >
                <span>
                  <span className="eyebrow block text-[10px]">Paciente</span>
                  <span className="num block text-2xl font-light tracking-tight">{c.patient}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[17px] leading-snug font-semibold">
                    {c.procedure} <span className="font-normal text-muted">· {c.teeth}</span>
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                    <span className="num">
                      Início {formatDayMonth(c.startDate)}/{year(c.startDate)}
                    </span>
                    <span className="num">
                      {done} de {c.sessions.length} consultas
                    </span>
                    {c.status === 'andamento' ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                        <span className="size-2 rounded-full bg-brand" /> Em andamento
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-ink-2">
                        <IconCheck size={14} /> Concluído
                      </span>
                    )}
                  </span>
                  {nxt ? (
                    <span className="mt-3 block border-l-2 border-ink pl-3 text-sm">
                      <span className="text-muted">Próxima consulta: </span>
                      <span className="font-semibold">{nxt.title}</span>
                      <span className="num text-muted">
                        {' '}
                        · {formatDayMonth(nxt.date)} · {relativeDays(DEMO_TODAY, nxt.date)}
                      </span>
                    </span>
                  ) : null}
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold sm:justify-self-end">
                  Ver caso <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
