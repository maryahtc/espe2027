/**
 * Regras da Início do aluno (Etapa 5) — funções puras, testáveis sem banco nem data real.
 *
 * Princípio: responder "o que está acontecendo e o que eu preciso fazer agora?" sem antecipar urgências.
 * - O próximo módulo aparece sempre (nome, data, contagem).
 * - As PENDÊNCIAS de preparação (obrigatórios, materiais, prazos do módulo) só ganham destaque nos
 *   30 dias anteriores ao módulo (ou durante ele). Antes disso, nada de sensação de atraso.
 */
import type { CohortVM, EventVM, ModuleVM } from '@/lib/academic/model'
import { addDays, daysBetween } from '@/lib/dates'

export const PREP_WINDOW_DAYS = 30
export const AGENDA_DAYS = 30
export const AGENDA_MAX = 5
/** Prazos de qualquer módulo que vencem logo entram nas pendências mesmo fora da janela. */
export const DEADLINE_ALERT_DAYS = 14
/** "Depois do módulo" fica visível até 30 dias após o fim. */
export const AFTER_MODULE_DAYS = 30

export type HomeMoment = 'encerrada' | 'antes-inicio' | 'durante-modulo' | 'antes-modulo' | 'sem-modulos'

type Focus = Pick<ModuleVM, 'state' | 'start' | 'end'>

export function homeMoment(cohort: Pick<CohortVM, 'startsOn' | 'endsOn' | 'status'>, focus: Focus | null, today: string): HomeMoment {
  if (cohort.status === 'encerrada' || today > cohort.endsOn) return 'encerrada'
  if (!focus) return 'sem-modulos'
  if (today < cohort.startsOn) return 'antes-inicio'
  if (focus.state === 'ongoing') return 'durante-modulo'
  return 'antes-modulo'
}

/** Dentro da janela de preparação: módulo em andamento ou começando em até 30 dias. */
export function inPrepWindow(focus: Focus | null, today: string): boolean {
  if (!focus) return false
  if (focus.state === 'ongoing') return true
  return Boolean(focus.start && daysBetween(today, focus.start) <= PREP_WINDOW_DAYS)
}

export type AgendaItem = {
  date: string
  kind: 'modulo' | 'online' | 'clinica' | 'prazo' | 'outro'
  title: string
  detail: string | null
  href: string
}

const PERIOD_LABEL = { manha: 'manhã', tarde: 'tarde', noite: 'noite', dia_todo: 'dia todo' } as const

/** Próximas atividades: dias de módulo e eventos da turma (inclui prazos), de hoje até +30 dias, no máximo 5. */
export function agenda(modules: ModuleVM[], events: EventVM[], today: string, days = AGENDA_DAYS, max = AGENDA_MAX): AgendaItem[] {
  const until = addDays(today, days)
  const items: AgendaItem[] = []
  for (const m of modules) {
    m.days.forEach((d, i) => {
      if (d.date < today || d.date > until) return
      const first = d.sessions[0]
      items.push({
        date: d.date,
        kind: 'modulo',
        title: `Módulo ${m.label} · Dia ${i + 1}${m.days.length > 1 ? ` de ${m.days.length}` : ''}`,
        detail: first
          ? `${first.title}${first.startsAt ? ` · ${first.startsAt.slice(0, 5)}` : ` · ${PERIOD_LABEL[first.period]}`}${d.sessions.length > 1 ? ` · +${d.sessions.length - 1}` : ''}`
          : 'Programação em definição',
        href: `/modulos/${m.id}`,
      })
    })
  }
  for (const e of events) {
    if (e.status !== 'publicado' || e.date < today || e.date > until) continue
    items.push({
      date: e.date,
      kind: e.kind,
      title: e.title,
      detail: e.startsAt ? e.startsAt.slice(0, 5) : null,
      href: e.fromModuleId ? `/modulos/${e.fromModuleId}` : `/cronograma/${e.date.slice(0, 7)}`,
    })
  }
  const order = { modulo: 0, online: 1, clinica: 2, outro: 3, prazo: 4 }
  return items.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind]).slice(0, max)
}

export type LibraryLink = {
  contentId: string
  slug: string
  title: string
  kind: string
  phase: 'antes' | 'durante' | 'depois'
  requirement: 'obrigatorio' | 'recomendado' | 'complementar'
  progress: 'iniciado' | 'concluido' | null
}

export type Pending = {
  /** Obrigatórios da biblioteca para a fase atual (antes; e durante, se o módulo estiver acontecendo). */
  required: { done: number; total: number; open: LibraryLink[] }
  materials: { checked: number; total: number }
  deadlines: Array<{ title: string; date: string; href: string }>
  /** Nada a fazer agora. */
  clear: boolean
}

/**
 * Pendências da Home. Fora da janela de preparação, só prazos que vencem em até 14 dias.
 * `focusDeadlines`: entregas do módulo em foco; `otherDeadlines`: prazos de outros módulos e da turma.
 */
export function pending(input: {
  focus: Focus | null
  today: string
  library: LibraryLink[]
  materials: { checked: boolean }[]
  focusDeadlines: Array<{ title: string; date: string; href: string }>
  otherDeadlines: Array<{ title: string; date: string; href: string }>
}): Pending {
  const window = inPrepWindow(input.focus, input.today)
  const ongoing = input.focus?.state === 'ongoing'
  const phases = ongoing ? ['antes', 'durante'] : ['antes']
  const req = window ? input.library.filter((l) => l.requirement === 'obrigatorio' && phases.includes(l.phase)) : []
  const alertUntil = addDays(input.today, DEADLINE_ALERT_DAYS)
  const deadlines = [
    ...(window ? input.focusDeadlines.filter((d) => d.date >= input.today) : []),
    ...input.otherDeadlines.filter((d) => d.date >= input.today && d.date <= alertUntil),
  ]
    .filter((d, i, all) => all.findIndex((x) => x.title === d.title && x.date === d.date) === i)
    .sort((a, b) => a.date.localeCompare(b.date))
  const materials = window ? { checked: input.materials.filter((m) => m.checked).length, total: input.materials.length } : { checked: 0, total: 0 }
  const open = req.filter((l) => l.progress !== 'concluido')
  return {
    required: { done: req.length - open.length, total: req.length, open },
    materials,
    deadlines,
    clear: open.length === 0 && materials.checked === materials.total && deadlines.length === 0,
  }
}

/** Último módulo concluído há até 30 dias (para "Depois do módulo"). */
export function recentlyFinished(modules: ModuleVM[], today: string): ModuleVM | null {
  const done = modules.filter((m) => m.state === 'done' && m.end && daysBetween(m.end, today) <= AFTER_MODULE_DAYS)
  return done.sort((a, b) => (b.end ?? '').localeCompare(a.end ?? ''))[0] ?? null
}

/** Obrigatórios da biblioteca nos módulos já concluídos e no módulo em foco: concluídos / total. */
export function requiredSoFar(
  contents: Array<{ id: string; progress: { status: string } | null; modules: Array<{ moduleId: string; requirement: string }> }>,
  modules: ModuleVM[],
  focusId: string | null,
): { done: number; total: number } {
  const relevant = new Set(modules.filter((m) => m.state === 'done' || m.id === focusId).map((m) => m.id))
  const req = contents.filter((c) => c.modules.some((l) => relevant.has(l.moduleId) && l.requirement === 'obrigatorio'))
  return { done: req.filter((c) => c.progress?.status === 'concluido').length, total: req.length }
}
