import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { cases } from '@/demo/cases'
import { byMonth, byProcedure } from '@/demo/production'
import { monthShort } from '@/lib/dates'

export const metadata: Metadata = { title: 'Minha produção' }

const FILTERS = ['Toda a especialização', 'Últimos 3 meses', 'Este semestre']

export default function ProductionPage() {
  const total = byProcedure.reduce((n, p) => n + p.count, 0)
  const categories = new Set(byProcedure.filter((p) => p.count > 0 && p.category !== 'Outros').map((p) => p.category)).size
  const max = Math.max(...byProcedure.map((p) => p.count))
  const maxMonth = Math.max(...byMonth.map(([, n]) => n))
  const low = byProcedure.filter((p) => p.name !== 'Outros' && p.count < p.cohortMedian)

  return (
    <>
      <PageTitle eyebrow="Clínica" title="Minha produção" lead="Sua exposição clínica até aqui. Só você e a coordenação veem estes números." />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
        {FILTERS.map((f, i) => (
          <span
            key={f}
            className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm ${i === 0 ? 'border-ink bg-ink text-on-ink' : 'border-rule-strong text-ink-2'}`}
          >
            {f}
          </span>
        ))}
      </div>

      <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-rule bg-rule">
        {[
          ['procedimentos', total],
          ['casos', cases.length + 7],
          ['categorias', categories],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface p-5 sm:p-6">
            <dt className="text-xs text-muted sm:text-sm">{k}</dt>
            <dd className="num mt-1 text-4xl leading-none font-light sm:text-5xl">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <section aria-labelledby="por-procedimento" className="lg:col-span-7">
          <h2 id="por-procedimento" className="text-2xl font-light tracking-tight">
            Por procedimento
          </h2>
          <div className="rule-brand mt-2 w-12" />
          <ul className="mt-6 space-y-3.5">
            {byProcedure.map((p) => (
              <li key={p.name} className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-3 sm:grid-cols-[11rem_1fr_3rem]">
                <span className="truncate text-sm">{p.name}</span>
                <span className="h-3 bg-sunken" title={`${p.name}: ${p.count} ${p.unit}`}>
                  <span className="block h-full rounded-r-[3px] bg-ink" style={{ width: `${(p.count / max) * 100}%` }} />
                </span>
                <span className="num text-right text-sm font-semibold">{p.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">Contagem na unidade de cada procedimento: dente, peça, arcada ou caso.</p>
        </section>

        <section aria-labelledby="pouca-exposicao" className="lg:col-span-5">
          <h2 id="pouca-exposicao" className="text-2xl font-light tracking-tight">
            Oportunidades para buscar
          </h2>
          <div className="rule-brand mt-2 w-12" />
          <p className="mt-4 text-sm leading-relaxed text-ink-2">
            Procedimentos em que você teve menos contato do que a média da turma até aqui. Vale conversar com a coordenação
            sobre oportunidades nas próximas clínicas.
          </p>
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {low.map((p) => (
              <li key={p.name} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                <span className="font-semibold">{p.name}</span>
                <span className="num text-muted">
                  você {p.count} · turma {p.cohortMedian}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/biblioteca" className="mt-4 inline-block text-sm font-semibold hover:underline">
            Estudar estes temas na biblioteca →
          </Link>
        </section>
      </div>

      <section aria-labelledby="evolucao" className="mt-14">
        <h2 id="evolucao" className="text-2xl font-light tracking-tight">
          Evolução mês a mês
        </h2>
        <div className="rule-brand mt-2 w-12" />
        <div className="mt-6 overflow-x-auto">
          <ol className="flex h-48 min-w-[36rem] items-end gap-2 border-b border-rule">
            {byMonth.map(([m, n], i) => (
              <li key={m} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${monthShort(`${m}-01`)}/${m.slice(2, 4)}: ${n}`}>
                <span className="num text-xs text-muted">{n || ''}</span>
                <span
                  className={`w-full max-w-9 rounded-t-[3px] ${i === byMonth.length - 1 ? 'bg-brand' : 'bg-ink'}`}
                  style={{ height: `${(n / maxMonth) * 75}%` }}
                />
              </li>
            ))}
          </ol>
          <ol className="flex min-w-[36rem] gap-2 pt-2">
            {byMonth.map(([m]) => (
              <li key={m} className="flex-1 text-center text-[10px] text-muted">
                {monthShort(`${m}-01`)}
                {m.endsWith('-01') || m === byMonth[0][0] ? <span className="num block">{m.slice(0, 4)}</span> : null}
              </li>
            ))}
          </ol>
        </div>
        <p className="mt-3 text-xs text-muted">Em vermelho, o mês atual (parcial).</p>
      </section>
    </>
  )
}
