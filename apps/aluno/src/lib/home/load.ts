import 'server-only'
import { cohortEvents, cohortModules, currentCohort, loadModuleDetail, type ModuleLibraryItem, type ResourceVM, today as realToday, viewerCohorts } from '@/lib/academic/load'
import { assignStates, type CohortVM, courseMonth, focusModule, type ModuleVM } from '@/lib/academic/model'
import type { AuthState } from '@/lib/auth/session'
import { loadHomeAnnouncements } from '@/lib/announcements/load'
import { activeAnnouncements, type AnnouncementVM } from '@/lib/announcements/model'
import { loadLibrary } from '@/lib/library/load'
import { isReleased, type ContentVM } from '@/lib/library/model'
import { agenda, type AgendaItem, homeMoment, type HomeMoment, inPrepWindow, pending, type Pending, PREP_WINDOW_DAYS, recentlyFinished, requiredSoFar } from './model'
import { addDays } from '@/lib/dates'

export type HomePreview = { cohortId: string | null; date: string | null }

export type HomeData = {
  cohort: CohortVM
  today: string
  month: { current: number; total: number }
  modules: ModuleVM[]
  focus: ModuleVM | null
  moment: HomeMoment
  window: boolean
  /** Quando a janela de preparação do módulo em foco começa (30 dias antes). */
  windowOpens: string | null
  pending: Pending
  /** Preparação do módulo em foco: biblioteca e recursos das fases atuais (só dentro da janela). */
  prep: { library: ModuleLibraryItem[]; resources: ResourceVM[]; note: string | null }
  agenda: AgendaItem[]
  after: { module: ModuleVM; library: ModuleLibraryItem[] } | null
  continuing: ContentVM[]
  required: { done: number; total: number }
  /** Avisos ativos hoje: importantes primeiro; comuns com "Entendi" já dados ficam de fora. */
  announcements: AnnouncementVM[]
  /** Pré-visualização do admin (outra data e/ou turma): nada é gravado. */
  preview: { date: string; cohort: string } | null
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Lê `?turma=&data=` só para admin; para os demais, ignora. */
export function parsePreview(auth: AuthState | null | 'previa', sp: Record<string, string | string[] | undefined>): HomePreview | null {
  if (!auth || auth === 'previa' || auth.role !== 'admin') return null
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null
  const cohortId = one(sp.turma)
  const date = one(sp.data)
  const valid = { cohortId: cohortId && /^[0-9a-f-]{36}$/.test(cohortId) ? cohortId : null, date: date && DATE.test(date) ? date : null }
  return valid.cohortId || valid.date ? valid : null
}

const releasedNow = (availableFrom: string | null) => !availableFrom || new Date(availableFrom) <= new Date()

export async function loadHome(auth: AuthState | null | 'previa', preview: HomePreview | null): Promise<HomeData | null> {
  const cohort = preview?.cohortId ? ((await viewerCohorts()).find((c) => c.id === preview.cohortId) ?? null) : await currentCohort()
  if (!cohort) return null
  const today = preview?.date ?? realToday()
  // Na prévia, os estados são recalculados numa cópia (os módulos em cache da requisição ficam intactos).
  const base = await cohortModules(cohort.id)
  const modules = preview ? assignStates(structuredClone(base), today) : base
  const focus = focusModule(modules)
  const userId = auth && auth !== 'previa' ? auth.userId : null

  const finished = recentlyFinished(modules, today)
  const [events, detail, afterDetail, library, notices] = await Promise.all([
    cohortEvents(cohort.id, modules.map((m) => m.id)),
    focus ? loadModuleDetail(focus.id, modules) : Promise.resolve(null),
    finished ? loadModuleDetail(finished.id, modules) : Promise.resolve(null),
    loadLibrary(userId, cohort.id),
    loadHomeAnnouncements(cohort.id, userId),
  ])

  // Só o que o aluno veria: publicado e já liberado (a RLS garante isso ao aluno; admin/coordenação veem mais).
  const visible = new Set(library.filter((c) => isReleased(c)).map((c) => c.id))
  const visibleLib = (items: ModuleLibraryItem[]) => items.filter((l) => l.status === 'publicado' && visible.has(l.contentId))

  const window = inPrepWindow(focus, today)
  const ongoing = focus?.state === 'ongoing'
  const phases = ongoing ? ['antes', 'durante'] : ['antes']
  const focusLib = visibleLib(detail?.library ?? [])
  const prepLib = window ? focusLib.filter((l) => phases.includes(l.phase)) : []
  const prepResources = window
    ? (detail?.resources ?? []).filter((r) => phases.includes(r.phase) && r.status === 'publicado' && releasedNow(r.availableFrom))
    : []

  const deadlines = events.filter((e) => e.kind === 'prazo' && e.status === 'publicado')
  const href = (e: (typeof deadlines)[number]) => (e.fromModuleId ? `/modulos/${e.fromModuleId}` : `/cronograma/${e.date.slice(0, 7)}`)

  return {
    cohort,
    today,
    month: courseMonth(cohort, today),
    modules,
    focus,
    moment: homeMoment(cohort, focus, today),
    window,
    windowOpens: focus?.start && !window ? addDays(focus.start, -PREP_WINDOW_DAYS) : null,
    pending: pending({
      focus,
      today,
      library: focusLib,
      materials: window ? (detail?.materials ?? []) : [],
      focusDeadlines: deadlines.filter((e) => focus && e.fromModuleId === focus.id).map((e) => ({ title: e.title, date: e.date, href: href(e) })),
      otherDeadlines: deadlines.filter((e) => !focus || e.fromModuleId !== focus.id).map((e) => ({ title: e.title, date: e.date, href: href(e) })),
    }),
    prep: { library: prepLib, resources: prepResources, note: window ? (focus?.preparation ?? null) : null },
    agenda: agenda(modules, events, today),
    after: finished && afterDetail ? { module: finished, library: visibleLib(afterDetail.library).filter((l) => l.phase === 'depois') } : null,
    continuing: library
      .filter((c) => c.progress?.status === 'iniciado' && visible.has(c.id))
      .sort((a, b) => (b.progress?.updatedAt ?? '').localeCompare(a.progress?.updatedAt ?? ''))
      .slice(0, 3),
    required: requiredSoFar(library.filter((c) => visible.has(c.id)), modules, today),
    // Na prévia, os "Entendi" de quem está vendo não escondem nada: mostra o que a turma vê naquela data.
    announcements: activeAnnouncements(notices.list, { cohortId: cohort.id, today, dismissed: preview ? new Set() : notices.dismissed }),
    preview: preview ? { date: today, cohort: cohort.name } : null,
  }
}
