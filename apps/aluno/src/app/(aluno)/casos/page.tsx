import { ButtonLink } from '@portal/ui/button'
import { IconArrowRight, IconCheck, IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CaseCover } from '@/components/cases/CaseCover'
import { nextSession, sortedCases } from '@/demo/cases'
import { DEMO_TODAY } from '@/demo/data'
import { day, monthShort, relativeDays } from '@/lib/dates'

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
        <PageTitle eyebrow="Clínica" title="Meus casos" lead="Seus pacientes da especialização, identificados por iniciais. Fotos completas e planejamento ficam no Smile Cloud." />
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
                className="glass inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-sm text-muted transition-colors hover:text-ink peer-checked:bg-ink peer-checked:text-on-ink peer-focus-visible:outline-2 peer-focus-visible:outline-ink"
              >
                {f.label}
                <span className="num text-xs">
                  {i === 0 ? list.length : i === 1 ? count('andamento') : count('concluido')}
                </span>
              </label>
            </span>
          ))}
        </div>
      </fieldset>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => {
          const nxt = nextSession(c)
          const done = c.sessions.filter((s) => s.status === 'realizada').length
          return (
            <li key={c.id} data-status={c.status}>
              <Link href={`/casos/${c.id}`} className="glass glass-interactive group flex h-full flex-col overflow-hidden rounded-[22px]">
                <span className="relative block">
                  <CaseCover item={c} className="aspect-[16/10]" />
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                    <span className="num text-4xl leading-none font-light tracking-tight text-white">{c.patient}</span>
                    {c.status === 'andamento' ? (
                      <span className="glass-strong inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wider text-white">
                        <span className="glow-dot !size-1.5" /> EM ANDAMENTO
                      </span>
                    ) : (
                      <span className="glass-strong inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wider text-white/80">
                        <IconCheck size={12} /> CONCLUÍDO
                      </span>
                    )}
                  </span>
                </span>
                <span className="flex flex-1 flex-col p-5">
                  <span className="text-lg leading-snug font-semibold">{c.procedure}</span>
                  <span className="num mt-1 text-sm text-muted">{c.teeth.split(', ').join(' · ')}</span>
                  <span className="mt-4 flex items-center gap-2" aria-label={`${done} de ${c.sessions.length} consultas realizadas`}>
                    {c.sessions.map((s) => (
                      <span key={s.number} className={`h-[3px] flex-1 rounded-full ${s.status === 'realizada' ? 'bg-ink/80' : 'bg-white/12'}`} />
                    ))}
                    <span className="num ml-1 text-xs text-muted">
                      {done}/{c.sessions.length}
                    </span>
                  </span>
                  <span className="mt-auto flex items-end justify-between gap-3 pt-5 text-sm">
                    {nxt ? (
                      <span>
                        <span className="eyebrow block text-[10px]">Próxima consulta</span>
                        <span className="mt-1 block">
                          {nxt.title} ·{' '}
                          <span className="num text-signal">
                            {day(nxt.date)} {monthShort(nxt.date).toUpperCase()}
                          </span>
                          <span className="text-muted"> · {relativeDays(DEMO_TODAY, nxt.date)}</span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted">Tratamento concluído</span>
                    )}
                    <IconArrowRight size={18} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
        <li>
          <Link
            href="/casos/novo"
            className="glass-interactive flex h-full min-h-60 flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed border-rule-strong text-sm font-semibold text-muted hover:text-ink"
          >
            <span className="flex size-12 items-center justify-center rounded-full border border-rule-strong">
              <IconPlus size={20} />
            </span>
            Registrar novo caso
          </Link>
        </li>
      </ul>
    </div>
  )
}
