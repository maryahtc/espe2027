import { cn } from '@portal/ui/cn'
import { IconArrowRight } from '@portal/ui/icons'
import { Chip, RequirementTag } from '@portal/ui/tag'
import Link from 'next/link'
import type { DeliverableVM, MaterialVM, ModuleDetail } from '@/lib/academic/load'
import {
  ACTIVITY_LABEL,
  datesChangedRecently,
  inDefinition,
  type ModuleVM,
  PHASE_LABEL,
  sessionTime,
  STAFF_LABEL,
} from '@/lib/academic/model'
import { type CivilDate, day, formatDayMonth, formatRange, monthLong, relativeDays, weekday } from '@/lib/dates'
import { MaterialChecklist } from './MaterialChecklist'
import { ResourceRow } from './ResourceRow'

function Section({ id, title, aside, children }: { id: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-32 border-t border-rule pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`${id}-t`} className="text-2xl font-light tracking-tight">
            {title}
          </h2>
          <div className="rule-brand mt-2 w-12" />
        </div>
        {aside ? <div className="text-sm text-muted">{aside}</div> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function stateLabel(m: ModuleVM, today: CivilDate) {
  if (m.state === 'done') return ' · concluído'
  if (m.state === 'ongoing') return ' · em andamento'
  if (m.state === 'next' && m.start) return ` · ${relativeDays(today, m.start)}`
  if (m.start) return ` · ${monthLong(m.start)}`
  return ' · data a definir'
}

function groupMaterials(materials: MaterialVM[], days: ModuleVM['days']) {
  const groups = new Map<string, MaterialVM[]>()
  for (const m of materials) {
    const d = days.findIndex((x) => x.id === m.dayId)
    const key = d >= 0 ? `${m.group} · dia ${d + 1}` : m.group
    groups.set(key, [...(groups.get(key) ?? []), m])
  }
  return [...groups.entries()].map(([title, items]) => ({ title, items }))
}

function Deliverables({ items }: { items: DeliverableVM[] }) {
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {items.map((d) => (
        <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4">
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold">{d.title}</span>
            {d.description ? <span className="mt-0.5 block text-sm text-ink-2">{d.description}</span> : null}
          </span>
          <span className="text-xs text-muted">
            {PHASE_LABEL[d.phase]}
            {d.dueDate ? <span className="num"> · prazo {formatDayMonth(d.dueDate)}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Página do módulo — a mesma para o aluno e para a pré-visualização do admin (regra Q).
 * `preview`: mostra também o que está em rascunho ou ainda não liberado, sinalizado.
 */
export function ModuleView({
  detail,
  siblings,
  today,
  preview = false,
}: {
  detail: ModuleDetail
  siblings: ModuleVM[]
  today: CivilDate
  preview?: boolean
}) {
  const m = detail.module
  const isNext = m.state === 'next' || m.state === 'ongoing'
  const idx = siblings.findIndex((s) => s.id === m.id)
  const prev = idx > 0 ? siblings[idx - 1] : undefined
  const next = idx >= 0 ? siblings[idx + 1] : undefined
  const activities = m.days.flatMap((d) => d.sessions)
  const before = detail.resources.filter((r) => r.phase === 'antes')
  const after = detail.resources.filter((r) => r.phase !== 'antes')
  const requiredBefore = before.filter((r) => r.requirement === 'obrigatorio').length
  const materialGroups = groupMaterials(detail.materials, m.days)
  const coordinationNotes = (m.materialsNotes ?? '').split('\n').map((n) => n.trim()).filter(Boolean)
  const visibleStaff = m.staff.filter((s) => preview || s.visible)
  const teacherIds = new Set(m.teachers.map((t) => t.id))
  const staffOnly = visibleStaff.filter((s) => !teacherIds.has(s.faculty.id))
  const changed = datesChangedRecently(m.datesChangedAt, today)
  const definition = inDefinition(m)

  const sections = [
    { id: 'visao-geral', label: 'Visão geral' },
    { id: 'programacao', label: 'Programação' },
    { id: 'antes', label: 'Antes do módulo' },
    { id: 'materiais', label: 'Materiais necessários' },
    { id: 'durante', label: 'Durante e depois' },
    ...(detail.deliverables.length ? [{ id: 'entregas', label: 'Entregas' }] : []),
    { id: 'docentes', label: 'Docentes' },
  ]

  return (
    <article>
      <Link href={m.start ? `/cronograma/${m.start.slice(0, 7)}` : '/cronograma/lista'} className="text-sm text-muted hover:text-ink">
        ← Cronograma{m.start ? ` · ${monthLong(m.start)}` : ''}
      </Link>

      <header id="visao-geral" aria-labelledby="modulo-titulo" className={cn('glass glass-sheen relative mt-6 scroll-mt-32 overflow-hidden rounded-[28px]', isNext && 'is-selected')}>
        {isNext ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 -left-28 size-[460px] rounded-full bg-[radial-gradient(circle,rgba(202,44,44,0.18),transparent_62%)]"
          />
        ) : null}
        <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-12 lg:p-12">
          <div className="lg:col-span-7">
            <p className="eyebrow flex items-center gap-2.5">
              {isNext ? <span className="glow-dot" /> : null}
              Módulo {m.label}
              {stateLabel(m, today)}
            </p>
            <p aria-hidden="true" className="num mt-5 text-[96px] leading-[0.8] font-extralight tracking-[-0.06em] sm:text-[140px]">
              {m.label}
            </p>
            <h1 id="modulo-titulo" className="mt-6 text-[2rem] leading-[1.05] font-light tracking-tight text-balance sm:text-5xl">
              {m.title}
            </h1>
            {m.theme ? <p className="mt-3 text-lg font-light text-ink-2">{m.theme}</p> : null}
            {m.start && m.end ? (
              <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
                <span className="num text-xl">{formatRange(m.start, m.end)}</span>
                <span className="text-sm text-muted">
                  {weekday(m.start)} a {weekday(m.end)}
                </span>
              </p>
            ) : (
              <p className="mt-4 text-xl text-muted">Data a definir</p>
            )}
            {changed || definition ? (
              <p className="mt-3 flex flex-wrap gap-2">
                {changed ? <Chip className="border-[rgba(202,44,44,0.6)] text-ink">Data alterada</Chip> : null}
                {definition ? <Chip>Programação em definição</Chip> : null}
              </p>
            ) : null}
            {m.description ? <p className="mt-6 max-w-[58ch] text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{m.description}</p> : null}
          </div>
          <dl className="grid grid-cols-2 content-start gap-x-6 gap-y-6 border-t border-rule pt-8 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-2 lg:pl-10">
            {[
              ['Dias', m.start && m.end ? `${formatDayMonth(m.start)} a ${formatDayMonth(m.end)}` : 'A definir'],
              ['Atividades', activities.length ? `${activities.length} em ${m.days.length} ${m.days.length === 1 ? 'dia' : 'dias'}` : 'Em definição'],
              ['Preparação', before.length ? `${before.length} ${before.length === 1 ? 'item' : 'itens'}${requiredBefore ? ` · ${requiredBefore} obrigatório${requiredBefore > 1 ? 's' : ''}` : ''}` : 'A publicar'],
              ['Materiais', detail.materials.length ? `${detail.materials.length} itens` : 'A publicar'],
              ...(m.workloadHours !== null ? [['Carga horária', `${String(m.workloadHours).replace('.', ',')} h`]] : []),
              ['Local', m.location || 'A definir'],
              ['Docentes', m.teachers.length ? m.teachers.map((t) => (t.tentative ? `${t.name} (a confirmar)` : t.name)).join(', ') : 'A definir'],
            ].map(([k, v]) => (
              <div key={k} className={k === 'Local' || k === 'Docentes' ? 'col-span-2' : ''}>
                <dt className="eyebrow text-[10px]">{k}</dt>
                <dd className="mt-1.5 text-[15px] text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <nav
        aria-label="Seções do módulo"
        className="glass-strong sticky top-14 z-20 -mx-4 mt-8 overflow-x-auto border-b px-4 sm:-mx-6 sm:px-6 lg:top-0 lg:mx-0 lg:rounded-full lg:border lg:px-6"
      >
        <ul className="flex gap-6 whitespace-nowrap">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="block border-b-2 border-transparent py-3 text-sm text-muted hover:border-rule-strong hover:text-ink">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 space-y-14">
        <Section id="programacao" title="Programação">
          {m.days.length ? (
            <div className="space-y-8">
              {m.days.map((d) => (
                <div key={d.id} className="grid gap-3 md:grid-cols-[9rem_1fr] md:gap-8">
                  <p className="md:pt-3">
                    <span className="eyebrow block">
                      {d.label ? `${d.label} · ` : ''}
                      {weekday(d.date)}
                    </span>
                    <span className="num text-3xl font-light">{day(d.date)}</span>
                    <span className="text-sm text-muted"> {monthLong(d.date)}</span>
                  </p>
                  {d.sessions.length ? (
                    <ol className="glass divide-y divide-white/[0.07] rounded-2xl px-5">
                      {d.sessions.map((it) => (
                        <li key={it.id} className="grid grid-cols-[5.5rem_1fr] gap-4 py-4 sm:grid-cols-[7rem_1fr_auto]">
                          <span className="num text-sm text-ink-2">{sessionTime(it)}</span>
                          <span>
                            <span className="block text-[15px] leading-snug font-semibold">{it.title}</span>
                            {it.description ? <span className="mt-0.5 block text-sm text-ink-2">{it.description}</span> : null}
                            {it.faculty.length ? (
                              <span className="block text-xs text-muted">
                                {it.faculty.map((f) => (f.tentative ? `${f.name} (a confirmar)` : f.name)).join(', ')}
                              </span>
                            ) : null}
                          </span>
                          <span className="col-start-2 sm:col-start-auto">
                            <Chip>{ACTIVITY_LABEL[it.type]}</Chip>
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="glass rounded-2xl px-5 py-4 text-sm text-muted">Programação em definição.</p>
                  )}
                  {d.note ? <p className="text-sm text-muted md:col-start-2">{d.note}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">As datas e a programação deste módulo ainda serão definidas.</p>
          )}
        </Section>

        <Section
          id="antes"
          title="Antes do módulo"
          aside={
            <span className="flex flex-wrap gap-4">
              <RequirementTag level="obrigatorio" />
              <RequirementTag level="recomendado" />
              <RequirementTag level="complementar" />
            </span>
          }
        >
          {m.preparation ? <p className="mb-4 max-w-[62ch] text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{m.preparation}</p> : null}
          {before.length ? (
            <ul className="divide-y divide-rule">
              {before.map((r) => (
                <ResourceRow key={r.id} item={r} preview={preview} />
              ))}
            </ul>
          ) : !m.preparation ? (
            <p className="text-sm text-muted">A coordenação ainda não publicou a preparação deste módulo.</p>
          ) : null}
        </Section>

        <Section id="materiais" title="Materiais necessários" aside={detail.materials.length ? <span className="num">{detail.materials.length} itens</span> : undefined}>
          {detail.materials.length || coordinationNotes.length ? (
            <div className="grid gap-8 lg:grid-cols-12">
              {detail.materials.length ? (
                <div className="glass grid gap-x-8 gap-y-6 rounded-[22px] p-6 sm:grid-cols-2 sm:p-7 lg:col-span-8">
                  <MaterialChecklist groups={materialGroups} disabled={preview} />
                </div>
              ) : null}
              <aside className={detail.materials.length ? 'lg:col-span-4' : 'lg:col-span-8'}>
                {coordinationNotes.length ? (
                  <>
                    <p className="eyebrow">Observações da coordenação</p>
                    <ul className="mt-2 space-y-3">
                      {coordinationNotes.map((n) => (
                        <li key={n} className="rounded-2xl border-l-2 border-l-[var(--brand)] bg-white/[0.04] p-4 text-sm leading-relaxed">
                          {n}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {detail.materials.length ? <p className="mt-4 text-xs text-muted">Marque os itens enquanto separa o material.</p> : null}
              </aside>
            </div>
          ) : (
            <p className="text-sm text-muted">A coordenação ainda não publicou a lista de materiais deste módulo.</p>
          )}
        </Section>

        <Section id="durante" title="Durante e depois">
          {after.length ? (
            <ul className="divide-y divide-rule border-y border-rule">
              {after.map((r) => (
                <ResourceRow key={r.id} item={r} preview={preview} />
              ))}
            </ul>
          ) : (
            <p className="max-w-xl text-sm leading-relaxed text-muted">
              Slides, PDFs, gravações das aulas e referências entram aqui
              {m.start ? (
                <>
                  {' '}
                  a partir de <span className="num text-ink">{formatDayMonth(m.start)}</span>
                </>
              ) : null}
              , conforme os docentes liberarem.
            </p>
          )}
        </Section>

        {detail.deliverables.length ? (
          <Section id="entregas" title="Entregas">
            <Deliverables items={detail.deliverables} />
          </Section>
        ) : null}

        <Section id="docentes" title="Docentes">
          {m.teachers.length || staffOnly.length ? (
            <div className="space-y-8">
              {m.teachers.length ? (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {m.teachers.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 glass rounded-2xl p-4">
                      <span className="num flex size-10 shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-semibold">{initials(t.name)}</span>
                      <span className="text-sm">
                        <span className="block font-semibold">
                          {t.honorific ? `${t.honorific} ` : ''}
                          {t.fullName}
                        </span>
                        <span className="block text-xs text-muted">
                          {t.tentative
                            ? 'A confirmar'
                            : t.activities
                              ? `${t.activities} ${t.activities === 1 ? 'atividade' : 'atividades'} neste módulo`
                              : 'Professor principal'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {staffOnly.length ? (
                <div>
                  <p className="eyebrow">Equipe do módulo</p>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {staffOnly.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-rule p-4">
                        <span className="num flex size-10 shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-semibold">{initials(s.faculty.name)}</span>
                        <span className="text-sm">
                          <span className="block font-semibold">{s.faculty.fullName}</span>
                          <span className="block text-xs text-muted">
                            {STAFF_LABEL[s.role]}
                            {s.tentative ? ' · a confirmar' : ''}
                            {preview && !s.visible ? ' · interna (invisível ao aluno)' : ''}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">Docentes a definir.</p>
          )}
        </Section>
      </div>

      <nav aria-label="Outros módulos" className="mt-16 grid grid-cols-2 gap-4 border-t border-rule pt-6 text-sm">
        {prev ? (
          <Link href={`/modulos/${prev.id}`} className="group">
            <span className="eyebrow block">← Módulo {prev.label}</span>
            <span className="mt-1 block font-semibold group-hover:underline">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/modulos/${next.id}`} className="group text-right">
            <span className="eyebrow inline-flex items-center gap-1">
              Módulo {next.label} <IconArrowRight size={12} />
            </span>
            <span className="mt-1 block font-semibold group-hover:underline">{next.title}</span>
          </Link>
        ) : null}
      </nav>
    </article>
  )
}
