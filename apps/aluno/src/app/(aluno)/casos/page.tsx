import { ButtonLink } from '@portal/ui/button'
import { EmptyState } from '@portal/ui/empty-state'
import { IconArrowRight, IconCheck, IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CaseCover } from '@/components/cases/CaseCover'
import { studentArea } from '@/lib/academic/student'
import { requireUser } from '@/lib/auth/session'
import { canRegister, coverUrls, loadMyCases, loadStepOptions } from '@/lib/cases/load'
import { type CaseFilter, caseHeadline, caseProcedures, filterCases } from '@/lib/cases/model'
import { formatDayMonth, relativeDays } from '@/lib/dates'

export const metadata: Metadata = { title: 'Meus casos' }

const FILTERS: Array<{ key: CaseFilter | null; label: string }> = [
  { key: null, label: 'Todos' },
  { key: 'andamento', label: 'Em andamento' },
  { key: 'concluidos', label: 'Concluídos' },
  { key: 'excluidos', label: 'Excluídos' },
]

export default async function CasesPage({ searchParams }: { searchParams: Promise<{ situacao?: string; q?: string }> }) {
  const auth = await requireUser()
  const area = await studentArea()
  if (!auth || !area) {
    return <EmptyState title="Meus casos">Assim que sua conta estiver vinculada a uma turma, seus casos aparecem aqui.</EmptyState>
  }
  const { situacao, q = '' } = await searchParams
  const filter = FILTERS.find((f) => f.key === situacao)?.key ?? null
  const [all, options, allowed] = await Promise.all([loadMyCases(auth.userId), loadStepOptions(), canRegister(area.cohort.id)])
  const list = filterCases(all, filter, q)
  const covers = await coverUrls(list.map((c) => c.coverPath), true)
  const count = (f: CaseFilter | null) => filterCases(all, f, '').length
  const href = (f: CaseFilter | null) => `/casos${f ? `?situacao=${f}` : ''}`

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle
          eyebrow="Clínica"
          title="Meus casos"
          lead="Seus pacientes da especialização, identificados por iniciais ou código. Fotos, exames e planejamento ficam no Smile Cloud."
        />
        {allowed ? (
          <ButtonLink href="/casos/novo" className="mb-8 md:mb-10">
            <IconPlus size={18} /> Registrar
          </ButtonLink>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Mostrar" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.label}
              href={href(f.key)}
              aria-current={filter === f.key ? 'page' : undefined}
              className={`glass inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm ${filter === f.key ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink'}`}
            >
              {f.label} <span className="num text-xs">{count(f.key)}</span>
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" action="/casos">
          {filter ? <input type="hidden" name="situacao" value={filter} /> : null}
          <input name="q" defaultValue={q} placeholder="Buscar pelo código" aria-label="Buscar pelo código" className="field min-h-10 w-44 px-3 text-sm" />
        </form>
      </div>

      {list.length ? (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const procs = caseProcedures(c.records, options)
            const records = c.records.filter((r) => !r.removed).length
            return (
              <li key={c.id} data-caso={c.patientLabel}>
                <Link href={`/casos/${c.id}`} className="glass glass-interactive group flex h-full flex-col overflow-hidden rounded-[22px]">
                  <span className="relative block">
                    <CaseCover item={{ patient: c.patientLabel }} src={c.coverPath ? covers.get(c.coverPath) : null} className="aspect-[16/9]" />
                    <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                      <span className="num text-4xl leading-none font-light tracking-tight text-white">{c.patientLabel}</span>
                      {c.removed ? (
                        <span className="glass-strong rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wider text-white/80">EXCLUÍDO</span>
                      ) : c.status === 'em_andamento' ? (
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
                    <span className="text-lg leading-snug font-semibold">{caseHeadline(c, options)}</span>
                    {c.title && procs.length ? <span className="mt-1 text-sm text-muted">{procs.slice(0, 3).join(' · ')}</span> : null}
                    <span className="mt-auto flex items-end justify-between gap-3 pt-5 text-sm">
                      <span className="text-muted">
                        <span className="num">{records}</span> {records === 1 ? 'registro' : 'registros'}
                        {c.lastActivityOn ? (
                          <>
                            {' '}
                            · último em <span className="num">{formatDayMonth(c.lastActivityOn)}</span> ({relativeDays(area.today, c.lastActivityOn)})
                          </>
                        ) : null}
                      </span>
                      <IconArrowRight size={18} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
          {allowed && filter !== 'excluidos' ? (
            <li>
              <Link
                href="/casos/novo"
                className="glass-interactive flex h-full min-h-48 flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed border-rule-strong text-sm font-semibold text-muted hover:text-ink"
              >
                <span className="flex size-12 items-center justify-center rounded-full border border-rule-strong">
                  <IconPlus size={20} />
                </span>
                Registrar
              </Link>
            </li>
          ) : null}
        </ul>
      ) : (
        <div className="mt-8">
          <EmptyState title={q ? 'Nenhum caso com esse código' : filter === 'excluidos' ? 'Nenhum caso excluído' : 'Nenhum caso ainda'}>
            {filter === 'excluidos'
              ? 'Casos excluídos ficam aqui e podem ser restaurados.'
              : allowed
                ? 'Registre o primeiro: paciente (iniciais ou código), data, o que você fez e a quantidade. Leva menos de um minuto.'
                : 'Os casos são registrados pelo aluno enquanto a turma está ativa.'}
          </EmptyState>
        </div>
      )}
    </div>
  )
}
