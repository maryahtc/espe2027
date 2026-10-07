/**
 * Modelo de leitura do cronograma e dos módulos (sem acesso a rede): tipos, rótulos e estados.
 * Os dados vêm do banco (load.ts); aqui ficam só as regras puras, testáveis.
 */
import type { CivilDate } from '@/lib/dates'

export type ContentStatus = 'rascunho' | 'publicado' | 'arquivado'
export type DayPeriod = 'manha' | 'tarde' | 'noite' | 'dia_todo'
export type ActivityType = 'teorica' | 'pratica' | 'hands_on' | 'clinica' | 'demonstracao' | 'discussao_caso' | 'online' | 'outro'
export type StaffRole = 'principal' | 'docente' | 'equipe_clinica' | 'coordenacao' | 'apoio'
export type FacultyKind = 'docente' | 'equipe_clinica' | 'convidado' | 'coordenacao' | 'apoio'
export type ResourceKind = 'link' | 'arquivo' | 'texto'
export type ModulePhase = 'antes' | 'durante' | 'depois'
export type RequirementLevel = 'obrigatorio' | 'recomendado' | 'complementar'
export type EventKind = 'online' | 'clinica' | 'prazo' | 'outro'

/** done = concluído · ongoing = em andamento · next = próximo · upcoming = futuro · undated = sem data. */
export type ModuleState = 'done' | 'ongoing' | 'next' | 'upcoming' | 'undated'

export const PERIOD_LABEL: Record<DayPeriod, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', dia_todo: 'Dia todo' }
export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  teorica: 'Teórica',
  pratica: 'Prática',
  hands_on: 'Hands-on',
  clinica: 'Clínica',
  demonstracao: 'Demonstração',
  discussao_caso: 'Discussão de caso',
  online: 'Online',
  outro: 'Atividade',
}
export const STAFF_LABEL: Record<StaffRole, string> = {
  principal: 'Professor principal',
  docente: 'Docente',
  equipe_clinica: 'Equipe clínica',
  coordenacao: 'Coordenação',
  apoio: 'Equipe de apoio',
}
export const FACULTY_KIND_LABEL: Record<FacultyKind, string> = {
  docente: 'Docente',
  equipe_clinica: 'Equipe clínica',
  convidado: 'Convidado',
  coordenacao: 'Coordenação',
  apoio: 'Apoio',
}
export const PHASE_LABEL: Record<ModulePhase, string> = { antes: 'Antes do módulo', durante: 'Durante', depois: 'Depois' }
export const EVENT_KIND_LABEL: Record<EventKind, string> = { online: 'Online', clinica: 'Clínica', prazo: 'Prazo', outro: 'Evento' }
export const STATUS_LABEL: Record<ContentStatus, string> = { rascunho: 'Rascunho', publicado: 'Publicado', arquivado: 'Arquivado' }

export type FacultyRef = {
  id: string
  name: string
  fullName: string
  honorific: string | null
  kind: FacultyKind
  specialty: string | null
  bio: string | null
  active: boolean
}

export type SessionVM = {
  id: string
  period: DayPeriod
  startsAt: string | null
  endsAt: string | null
  title: string
  description: string | null
  type: ActivityType
  position: number
  faculty: Array<{ id: string; name: string; tentative: boolean; role: 'responsavel' | 'apoio' }>
}

export type DayVM = { id: string; date: CivilDate; label: string | null; note: string | null; sessions: SessionVM[] }

export type StaffVM = { id: string; faculty: FacultyRef; role: StaffRole; visible: boolean; tentative: boolean; position: number }

export type ModuleVM = {
  id: string
  cohortId: string
  position: number
  number: number | null
  /** Número com dois dígitos ("01"), ou "—" sem número. */
  label: string
  title: string
  theme: string | null
  description: string | null
  location: string | null
  workloadHours: number | null
  preparation: string | null
  materialsNotes: string | null
  status: ContentStatus
  publishedAt: string | null
  datesChangedAt: string | null
  start: CivilDate | null
  end: CivilDate | null
  days: DayVM[]
  /** Quem conduz atividades, na ordem em que aparece; "a confirmar" se todas as participações são incertas. */
  teachers: Array<FacultyRef & { tentative: boolean; activities: number }>
  staff: StaffVM[]
  state: ModuleState
}

export type EventVM = {
  id: string
  date: CivilDate
  startsAt: string | null
  title: string
  description: string | null
  kind: EventKind
  status: ContentStatus
  /** Entregável com prazo (não editável aqui: vem do módulo). */
  fromModuleId?: string
}

export type CohortVM = {
  id: string
  name: string
  slug: string
  startsOn: CivilDate
  endsOn: CivilDate
  status: 'ativa' | 'encerrada'
  description: string | null
  closedAt: string | null
}

export function moduleLabel(number: number | null): string {
  return number === null ? '—' : String(number).padStart(2, '0')
}

/** Estados pela data de hoje. Só um módulo é "próximo": o primeiro futuro, quando nenhum está em andamento. */
export function assignStates<T extends { start: CivilDate | null; end: CivilDate | null; state: ModuleState }>(modules: T[], today: CivilDate): T[] {
  let hasOngoing = false
  for (const m of modules) {
    if (!m.start || !m.end) m.state = 'undated'
    else if (m.end < today) m.state = 'done'
    else if (m.start <= today) {
      m.state = 'ongoing'
      hasOngoing = true
    } else m.state = 'upcoming'
  }
  if (!hasOngoing) {
    const next = modules
      .filter((m) => m.state === 'upcoming')
      .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''))[0]
    if (next) next.state = 'next'
  }
  return modules
}

/** Módulo em destaque (Início, calendário): o em andamento, senão o próximo. */
export function focusModule<T extends { state: ModuleState }>(modules: T[]): T | null {
  return modules.find((m) => m.state === 'ongoing') ?? modules.find((m) => m.state === 'next') ?? null
}

/** Programação ainda incompleta: módulo sem dias, ou algum dia sem atividades. */
export function inDefinition(m: { days: Array<{ sessions: unknown[] }> }): boolean {
  return m.days.length === 0 || m.days.some((d) => d.sessions.length === 0)
}

/** "Data alterada" fica visível por 30 dias depois da mudança. */
export function datesChangedRecently(changedAt: string | null, today: CivilDate): boolean {
  if (!changedAt) return false
  const limit = new Date(`${today}T00:00:00Z`).getTime() - 30 * 86_400_000
  return new Date(changedAt).getTime() >= limit
}

/** Mês do curso (1…total) pela data de hoje; 0 antes do início. */
export function courseMonth(cohort: { startsOn: CivilDate; endsOn: CivilDate }, today: CivilDate) {
  const [y0, m0] = cohort.startsOn.split('-').map(Number) as [number, number]
  const [y1, m1] = cohort.endsOn.split('-').map(Number) as [number, number]
  const [y, m] = today.split('-').map(Number) as [number, number]
  const total = (y1 - y0) * 12 + (m1 - m0) + 1
  const current = (y - y0) * 12 + (m - m0) + 1
  return { current: Math.max(0, Math.min(current, total)), total }
}

/** Horário da atividade: "08:30–12:00", ou o turno quando não há horário. */
export function sessionTime(s: Pick<SessionVM, 'startsAt' | 'endsAt' | 'period'>): string {
  const t = (v: string | null) => (v ? v.slice(0, 5) : null)
  if (s.startsAt && s.endsAt) return `${t(s.startsAt)}–${t(s.endsAt)}`
  if (s.startsAt) return `${t(s.startsAt)}`
  return PERIOD_LABEL[s.period]
}

export function teacherNames(m: Pick<ModuleVM, 'teachers'>): string {
  return m.teachers.map((t) => (t.tentative ? `${t.name} (a confirmar)` : t.name)).join(', ')
}
