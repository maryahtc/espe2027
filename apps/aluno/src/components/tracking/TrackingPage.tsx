import { PageTitle } from '@portal/ui/section'
import { RequirementTag } from '@portal/ui/tag'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { today } from '@/lib/academic/load'
import { moduleLabel } from '@/lib/academic/model'
import type { AuthState } from '@/lib/auth/session'
import { KIND_LABEL } from '@/lib/library/model'
import { loadCohortTracking, trackingCohorts } from '@/lib/tracking/load'
import { type CellState, cellState, progressIndex, type TModule } from '@/lib/tracking/model'

const UUID = /^[0-9a-f-]{36}$/
const when = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit' })
const fmt = (iso: string | null) => (iso ? when.format(new Date(iso)) : '—')

/** Situação por forma (não só cor): ✓ concluído · ◐ em andamento · — não iniciado. */
function Mark({ state, percent }: { state: CellState; percent?: number }) {
  if (state === 'concluido') return <span className="font-semibold text-ink">✓ Concluído</span>
  if (state === 'andamento') return <span className="text-ink-2">◐ Em andamento{percent ? <span className="num"> · {percent}%</span> : null}</span>
  return <span className="text-faint">— Não iniciado</span>
}

function Bar({ pct }: { pct: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full bg-brand" style={{ width: `${pct}%` }} />
      </span>
      <span className="num w-10 text-right text-xs text-muted">{pct}%</span>
    </span>
  )
}

const modName = (m: Pick<TModule, 'number' | 'title' | 'theme'>) => `Módulo ${moduleLabel(m.number)}${m.theme ? ` · ${m.theme}` : ''}`

/**
 * Acompanhamento da biblioteca: visão da turma, de um aluno ou de um conteúdo (pelo endereço).
 * Admin vê todas as turmas; coordenação só a(s) que coordena. A RLS do banco garante o mesmo.
 */
export async function TrackingPage({ auth, base, sp }: { auth: AuthState; base: string; sp: Record<string, string | string[] | undefined> }) {
  const one = (k: string) => {
    const v = sp[k]
    return (Array.isArray(v) ? v[0] : v) ?? null
  }
  const cohorts = await trackingCohorts(auth)
  if (!cohorts.length) {
    return (
      <>
        <PageTitle eyebrow="Acompanhamento" title="Progresso na biblioteca" />
        <p className="text-sm text-muted">Nenhuma turma para acompanhar.</p>
      </>
    )
  }
  const wanted = one('turma')
  // Padrão: a turma em andamento hoje; senão a próxima a começar; senão a mais recente.
  const day = today()
  const active = cohorts.filter((c) => c.status === 'ativa')
  const cohort =
    cohorts.find((c) => c.id === wanted) ??
    active.find((c) => c.startsOn <= day && day <= c.endsOn) ??
    [...active].filter((c) => c.startsOn > day).sort((a, b) => a.startsOn.localeCompare(b.startsOn))[0] ??
    cohorts[0]!
  const data = await loadCohortTracking(cohort.id)
  const t = data.tracking
  const href = (extra: Record<string, string> = {}) => `${base}?${new URLSearchParams({ turma: cohort.id, ...extra })}`
  const idx = progressIndex(data.progress)

  const studentId = one('aluno')
  const contentId = one('conteudo')

  const header = (
    <>
      <PageTitle
        eyebrow={`Acompanhamento · ${cohort.name}`}
        title="Progresso na biblioteca"
        lead="Quem concluiu, quem está assistindo e quem ainda não começou. Conta só o que está publicado, liberado e disponível para a turma."
      />
      {cohorts.length > 1 ? (
        <nav aria-label="Turma" className="-mt-4 mb-6 flex flex-wrap gap-2">
          {cohorts.map((c) => (
            <Link
              key={c.id}
              href={`${base}?turma=${c.id}`}
              aria-current={c.id === cohort.id ? 'page' : undefined}
              className={
                c.id === cohort.id
                  ? 'inline-flex min-h-9 items-center rounded-full border border-ink bg-ink px-3.5 text-sm text-on-ink'
                  : 'glass inline-flex min-h-9 items-center rounded-full px-3.5 text-sm text-muted hover:text-ink'
              }
            >
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  )

  // ── Um aluno ──
  if (studentId) {
    if (!UUID.test(studentId)) notFound()
    const row = t.students.find((s) => s.student.id === studentId)
    if (!row) notFound()
    const byModule = data.modules
      .map((m) => ({ m, items: data.contents.filter((c) => c.modules.some((l) => l.moduleId === m.id)) }))
      .filter((g) => g.items.length)
    const linked = new Set(byModule.flatMap((g) => g.items.map((c) => c.id)))
    const others = data.contents.filter((c) => !linked.has(c.id))
    const line = (c: (typeof data.contents)[number], requirement?: 'obrigatorio' | 'recomendado' | 'complementar') => {
      const p = idx.get(`${studentId}:${c.id}`)
      return (
        <li key={c.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1fr_9rem_11rem_6rem] sm:items-center">
          <span className="min-w-0">
            <Link href={href({ conteudo: c.id })} className="font-semibold hover:underline">
              {c.title}
            </Link>
            <span className="ml-2 text-xs text-muted">{KIND_LABEL[c.kind]}</span>
          </span>
          <span>{requirement ? <RequirementTag level={requirement} /> : null}</span>
          <Mark state={cellState(p)} percent={p?.percent} />
          <span className="num text-xs text-muted">{fmt(p?.updatedAt ?? null)}</span>
        </li>
      )
    }
    return (
      <>
        {header}
        <Link href={href()} className="text-sm text-muted hover:text-ink">
          ← Turma
        </Link>
        <h2 className="mt-4 text-2xl font-light tracking-tight">{row.student.name}</h2>
        <p className="mt-1 text-sm text-muted">
          <span className="num text-ink">{row.done}</span> de <span className="num">{row.total}</span> concluídos ·{' '}
          <span className="num">{row.ongoing}</span> em andamento · última atividade {fmt(row.lastActivity)}
        </p>
        {byModule.map(({ m, items }) => (
          <section key={m.id} className="mt-8">
            <h3 className="eyebrow">{modName(m)}</h3>
            <ul className="mt-2 divide-y divide-rule rounded-2xl border border-rule bg-surface">
              {[...items]
                .sort((a, b) => (a.modules.find((l) => l.moduleId === m.id)!.requirement === 'obrigatorio' ? -1 : 0) - (b.modules.find((l) => l.moduleId === m.id)!.requirement === 'obrigatorio' ? -1 : 0))
                .map((c) => line(c, c.modules.find((l) => l.moduleId === m.id)!.requirement))}
            </ul>
          </section>
        ))}
        {others.length ? (
          <section className="mt-8">
            <h3 className="eyebrow">Outros conteúdos da biblioteca</h3>
            <ul className="mt-2 divide-y divide-rule rounded-2xl border border-rule bg-surface">{others.map((c) => line(c))}</ul>
          </section>
        ) : null}
      </>
    )
  }

  // ── Um conteúdo ──
  if (contentId) {
    if (!UUID.test(contentId)) notFound()
    const row = t.contents.find((c) => c.content.id === contentId)
    if (!row) notFound()
    return (
      <>
        {header}
        <Link href={href()} className="text-sm text-muted hover:text-ink">
          ← Turma
        </Link>
        <h2 className="mt-4 text-2xl font-light tracking-tight">{row.content.title}</h2>
        <p className="mt-1 text-sm text-muted">
          {KIND_LABEL[row.content.kind]} · {row.content.category} · <span className="num text-ink">{row.done}</span> concluíram ·{' '}
          <span className="num">{row.ongoing}</span> em andamento · <span className="num">{row.notStarted}</span> não iniciaram
        </p>
        <ul className="mt-6 divide-y divide-rule rounded-2xl border border-rule bg-surface">
          {t.students.map((s) => {
            const p = idx.get(`${s.student.id}:${contentId}`)
            return (
              <li key={s.student.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1fr_12rem_6rem] sm:items-center">
                <Link href={href({ aluno: s.student.id })} className="font-semibold hover:underline">
                  {s.student.name}
                </Link>
                <Mark state={cellState(p)} percent={p?.percent} />
                <span className="num text-xs text-muted">{fmt(p?.updatedAt ?? null)}</span>
              </li>
            )
          })}
        </ul>
      </>
    )
  }

  // ── Turma ──
  return (
    <>
      {header}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ['Alunos ativos', String(t.totals.students)],
          ['Conteúdos disponíveis', String(t.totals.contents)],
          ['Conclusão média', `${t.totals.avgPct}%`],
          ['Com obrigatoriedade', String(t.totals.required)],
        ].map(([k, v]) => (
          <div key={k} className="glass rounded-2xl p-4">
            <p className="eyebrow text-[10px]">{k}</p>
            <p className="num mt-1 text-2xl font-light">{v}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-right text-sm">
        <a href={`/api/acompanhamento?turma=${cohort.id}`} className="font-semibold underline-offset-4 hover:underline" download>
          Baixar planilha (CSV)
        </a>
      </p>

      <section className="mt-8" aria-labelledby="t-modulos">
        <h2 id="t-modulos" className="eyebrow">
          Obrigatórios por módulo
        </h2>
        {t.modules.length ? (
          <ul className="mt-2 divide-y divide-rule rounded-2xl border border-rule bg-surface">
            {t.modules.map((r) => (
              <li key={r.module.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1fr_9rem_10rem] sm:items-center">
                <span className="min-w-0">
                  <span className="font-semibold">{modName(r.module)}</span>
                  {t.focus?.id === r.module.id ? <span className="ml-2 text-xs font-semibold text-signal">{r.module.state === 'ongoing' ? 'em andamento' : 'próximo'}</span> : null}
                  <span className="block text-xs text-muted">{r.required.map((c) => c.title).join(' · ')}</span>
                </span>
                <span className="num text-xs text-muted">
                  {r.allDone} de {r.students} com tudo
                </span>
                <Bar pct={r.pct} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Nenhum conteúdo obrigatório ligado aos módulos desta turma ainda.</p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="t-alunos">
        <h2 id="t-alunos" className="eyebrow">
          Por aluno
        </h2>
        {t.students.length ? (
          <div className="mt-2 overflow-x-auto rounded-2xl border border-rule bg-surface">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-rule">
                  <th className="px-4 py-2 font-semibold">Aluno</th>
                  <th className="px-4 py-2 font-semibold">Concluídos</th>
                  <th className="px-4 py-2 font-semibold">Em andamento</th>
                  {t.focus ? <th className="px-4 py-2 font-semibold">Obrigatórios · Módulo {moduleLabel(t.focus.number)}</th> : null}
                  <th className="px-4 py-2 font-semibold">Última atividade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {t.students.map((s) => (
                  <tr key={s.student.id}>
                    <td className="px-4 py-2.5">
                      <Link href={href({ aluno: s.student.id })} className="font-semibold hover:underline">
                        {s.student.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="num">{s.done}</span>
                      <span className="text-muted">/{s.total}</span> <Bar pct={s.pct} />
                    </td>
                    <td className="num px-4 py-2.5">{s.ongoing}</td>
                    {t.focus ? (
                      <td className={`num px-4 py-2.5 ${s.focusRequiredTotal && s.focusRequiredDone < s.focusRequiredTotal ? 'text-signal' : ''}`}>
                        {s.focusRequiredTotal ? `${s.focusRequiredDone}/${s.focusRequiredTotal}` : '—'}
                      </td>
                    ) : null}
                    <td className="num px-4 py-2.5 text-xs text-muted">{fmt(s.lastActivity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Nenhum aluno com matrícula ativa nesta turma.</p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="t-conteudos">
        <h2 id="t-conteudos" className="eyebrow">
          Por conteúdo
        </h2>
        {t.contents.length ? (
          <ul className="mt-2 divide-y divide-rule rounded-2xl border border-rule bg-surface">
            {[...t.contents]
              .sort((a, b) => b.pct - a.pct || a.content.title.localeCompare(b.content.title, 'pt-BR'))
              .map((r) => (
                <li key={r.content.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1fr_14rem_10rem] sm:items-center">
                  <span className="min-w-0">
                    <Link href={href({ conteudo: r.content.id })} className="font-semibold hover:underline">
                      {r.content.title}
                    </Link>
                    <span className="ml-2 text-xs text-muted">{KIND_LABEL[r.content.kind]}</span>
                  </span>
                  <span className="text-xs text-muted">
                    <span className="num text-ink">{r.done}</span> concluíram · <span className="num">{r.ongoing}</span> assistindo ·{' '}
                    <span className="num">{r.notStarted}</span> não começaram
                  </span>
                  <Bar pct={r.pct} />
                </li>
              ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Nenhum conteúdo publicado disponível para esta turma.</p>
        )}
      </section>
    </>
  )
}
