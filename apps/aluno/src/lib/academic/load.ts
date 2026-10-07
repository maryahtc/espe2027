import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { CivilDate } from '@/lib/dates'
import {
  assignStates,
  type CohortVM,
  type ContentStatus,
  type DayVM,
  type EventVM,
  type FacultyRef,
  type ModuleVM,
  moduleLabel,
  type ModulePhase,
  type RequirementLevel,
  type ResourceKind,
  type SessionVM,
  type StaffVM,
} from './model'

/** Hoje em São Paulo. PORTAL_HOJE (AAAA-MM-DD) permite simular outra data em testes. */
export function today(): CivilDate {
  const forced = process.env.PORTAL_HOJE
  if (forced && /^\d{4}-\d{2}-\d{2}$/.test(forced)) return forced
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

export const COHORT_COOKIE = 'portal_turma'

const FACULTY_COLS = 'id, full_name, display_name, honorific, kind, specialty, short_bio, active'
export const MODULE_COLS = `id, cohort_id, position, number, title, theme, description, location, workload_hours, preparation,
  materials_notes, status, published_at, dates_changed_at,
  module_days(id, date, label, note,
    module_sessions(id, period, starts_at, ends_at, title, description, activity_type, position,
      session_faculty(faculty_id, tentative, role, faculty(${FACULTY_COLS})))),
  module_staff(id, role, visible_to_students, tentative, position, faculty(${FACULTY_COLS}))`

type FacultyRow = {
  id: string
  full_name: string
  display_name: string
  honorific: string | null
  kind: FacultyRef['kind']
  specialty: string | null
  short_bio: string | null
  active: boolean
}

export function toFaculty(f: FacultyRow): FacultyRef {
  return {
    id: f.id,
    name: f.display_name,
    fullName: f.full_name,
    honorific: f.honorific,
    kind: f.kind,
    specialty: f.specialty,
    bio: f.short_bio,
    active: f.active,
  }
}

// O formato que o PostgREST devolve para MODULE_COLS.
export type ModuleRow = {
  id: string
  cohort_id: string
  position: number
  number: number | null
  title: string
  theme: string | null
  description: string | null
  location: string | null
  workload_hours: number | null
  preparation: string | null
  materials_notes: string | null
  status: ContentStatus
  published_at: string | null
  dates_changed_at: string | null
  module_days: Array<{
    id: string
    date: string
    label: string | null
    note: string | null
    module_sessions: Array<{
      id: string
      period: SessionVM['period']
      starts_at: string | null
      ends_at: string | null
      title: string
      description: string | null
      activity_type: SessionVM['type']
      position: number
      session_faculty: Array<{ faculty_id: string; tentative: boolean; role: 'responsavel' | 'apoio'; faculty: FacultyRow | null }>
    }>
  }>
  module_staff: Array<{ id: string; role: StaffVM['role']; visible_to_students: boolean; tentative: boolean; position: number; faculty: FacultyRow | null }>
}

const PERIOD_ORDER = { manha: 0, dia_todo: 1, tarde: 2, noite: 3 } as const

export function toModule(r: ModuleRow): ModuleVM {
  const days: DayVM[] = [...r.module_days]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      id: d.id,
      date: d.date,
      label: d.label,
      note: d.note,
      sessions: [...d.module_sessions]
        .sort((a, b) => (a.starts_at ?? '').localeCompare(b.starts_at ?? '') || PERIOD_ORDER[a.period] - PERIOD_ORDER[b.period] || a.position - b.position)
        .map((s) => ({
          id: s.id,
          period: s.period,
          startsAt: s.starts_at,
          endsAt: s.ends_at,
          title: s.title,
          description: s.description,
          type: s.activity_type,
          position: s.position,
          faculty: s.session_faculty
            .filter((sf) => sf.faculty)
            .map((sf) => ({ id: sf.faculty_id, name: sf.faculty!.display_name, tentative: sf.tentative, role: sf.role })),
        })),
    }))

  const teachers = new Map<string, FacultyRef & { tentative: boolean; activities: number }>()
  for (const d of r.module_days) {
    for (const s of d.module_sessions) {
      for (const sf of s.session_faculty) {
        if (!sf.faculty) continue
        const t = teachers.get(sf.faculty_id)
        if (t) {
          t.activities += 1
          t.tentative = t.tentative && sf.tentative
        } else teachers.set(sf.faculty_id, { ...toFaculty(sf.faculty), tentative: sf.tentative, activities: 1 })
      }
    }
  }
  const staff: StaffVM[] = r.module_staff
    .filter((s) => s.faculty)
    .sort((a, b) => a.position - b.position)
    .map((s) => ({ id: s.id, faculty: toFaculty(s.faculty!), role: s.role, visible: s.visible_to_students, tentative: s.tentative, position: s.position }))
  // Professor principal aparece primeiro entre os docentes.
  const principal = staff.find((s) => s.role === 'principal')
  const ordered = [...teachers.values()]
  if (principal && !teachers.has(principal.faculty.id)) ordered.unshift({ ...principal.faculty, tentative: principal.tentative, activities: 0 })

  return {
    id: r.id,
    cohortId: r.cohort_id,
    position: r.position,
    number: r.number,
    label: moduleLabel(r.number),
    title: r.title,
    theme: r.theme,
    description: r.description,
    location: r.location,
    workloadHours: r.workload_hours === null ? null : Number(r.workload_hours),
    preparation: r.preparation,
    materialsNotes: r.materials_notes,
    status: r.status,
    publishedAt: r.published_at,
    datesChangedAt: r.dates_changed_at,
    start: days[0]?.date ?? null,
    end: days.at(-1)?.date ?? null,
    days,
    teachers: ordered,
    staff,
    state: 'upcoming',
  }
}

async function client() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) throw new Error('Supabase não configurado.')
  return supabase
}

type CohortRow = { id: string; name: string; slug: string; starts_on: string; ends_on: string; status: 'ativa' | 'encerrada'; description: string | null; closed_at: string | null }
export function toCohort(c: CohortRow): CohortVM {
  return { id: c.id, name: c.name, slug: c.slug, startsOn: c.starts_on, endsOn: c.ends_on, status: c.status, description: c.description, closedAt: c.closed_at }
}

/** Turmas que a pessoa pode ver (RLS: matrícula ativa; admin vê todas). */
export const viewerCohorts = cache(async (): Promise<CohortVM[]> => {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return []
  const { data } = await supabase
    .from('cohorts')
    .select('id, name, slug, starts_on, ends_on, status, description, closed_at')
    .order('starts_on', { ascending: false })
  return (data ?? []).map(toCohort)
})

/**
 * Turma exibida na área do aluno: a escolhida (cookie), se a pessoa tiver acesso; senão a turma ativa mais
 * recente; senão a mais recente. Admin e coordenação escolhem entre as turmas que podem ver.
 */
export const currentCohort = cache(async (): Promise<CohortVM | null> => {
  const list = await viewerCohorts()
  const chosen = (await cookies()).get(COHORT_COOKIE)?.value
  return list.find((c) => c.id === chosen) ?? list.find((c) => c.status === 'ativa') ?? list[0] ?? null
})

/** Módulos de uma turma. Na área do aluno, só publicados (mesmo para admin, que vê "como aluno"). */
export const cohortModules = cache(async (cohortId: string, onlyPublished = true): Promise<ModuleVM[]> => {
  const supabase = await client()
  let q = supabase.from('modules').select(MODULE_COLS).eq('cohort_id', cohortId)
  q = onlyPublished ? q.eq('status', 'publicado') : q.neq('status', 'arquivado')
  const { data, error } = await q.order('position')
  if (error) throw new Error(`Falha ao carregar módulos: ${error.message}`)
  const modules = (data as unknown as ModuleRow[]).map(toModule)
  return assignStates(modules, today())
})

/** Eventos da turma + prazos de entregáveis com data, para o calendário. */
export const cohortEvents = cache(async (cohortId: string, moduleIds: string[]): Promise<EventVM[]> => {
  const supabase = await client()
  const [{ data: events }, { data: deliverables }] = await Promise.all([
    supabase
      .from('cohort_events')
      .select('id, date, starts_at, title, description, kind, status')
      .eq('cohort_id', cohortId)
      .eq('status', 'publicado')
      .order('date'),
    moduleIds.length
      ? supabase.from('module_deliverables').select('id, module_id, title, description, due_date').in('module_id', moduleIds).not('due_date', 'is', null)
      : Promise.resolve({ data: [] as Array<{ id: string; module_id: string; title: string; description: string | null; due_date: string | null }> }),
  ])
  return [
    ...(events ?? []).map((e) => ({ id: e.id, date: e.date, startsAt: e.starts_at, title: e.title, description: e.description, kind: e.kind, status: e.status })),
    ...(deliverables ?? []).map((d) => ({
      id: d.id,
      date: d.due_date!,
      startsAt: null,
      title: `Entrega: ${d.title}`,
      description: d.description,
      kind: 'prazo' as const,
      status: 'publicado' as const,
      fromModuleId: d.module_id,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))
})

export type MaterialVM = { id: string; dayId: string | null; group: string; item: string; note: string | null; required: boolean; position: number; checked: boolean }
export type DeliverableVM = { id: string; title: string; description: string | null; dueDate: string | null; phase: ModulePhase; position: number }
export type ResourceVM = {
  id: string
  sessionId: string | null
  kind: ResourceKind
  title: string
  description: string | null
  url: string | null
  filePath: string | null
  body: string | null
  phase: ModulePhase
  requirement: RequirementLevel
  availableFrom: string | null
  status: ContentStatus
  position: number
}

export type ModuleDetail = {
  module: ModuleVM
  materials: MaterialVM[]
  deliverables: DeliverableVM[]
  resources: ResourceVM[]
  /** Observações internas: só chegam para admin e coordenação (RLS). */
  internalNotes: string | null
}

/** Um módulo com tudo o que pertence a ele. A RLS decide o que cada pessoa recebe. */
export async function loadModuleDetail(id: string, siblings?: ModuleVM[]): Promise<ModuleDetail | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const supabase = await client()
  const { data: row } = await supabase.from('modules').select(MODULE_COLS).eq('id', id).maybeSingle()
  if (!row) return null
  const mod = toModule(row as unknown as ModuleRow)
  const states = siblings?.find((m) => m.id === id)
  if (states) mod.state = states.state
  else assignStates([mod], today())

  const [{ data: materials }, { data: checks }, { data: deliverables }, { data: resources }, { data: notes }] = await Promise.all([
    supabase.from('module_materials').select('id, day_id, group_label, item, note, required, position').eq('module_id', id).order('position'),
    supabase.from('material_checks').select('material_id'),
    supabase.from('module_deliverables').select('id, title, description, due_date, phase, position').eq('module_id', id).order('position'),
    supabase
      .from('module_resources')
      .select('id, session_id, kind, title, description, url, file_path, body, phase, requirement, available_from, status, position')
      .eq('module_id', id)
      .order('position'),
    supabase.from('module_internal_notes').select('notes').eq('module_id', id).maybeSingle(),
  ])
  const checked = new Set((checks ?? []).map((c) => c.material_id))
  return {
    module: mod,
    materials: (materials ?? []).map((m) => ({
      id: m.id,
      dayId: m.day_id,
      group: m.group_label,
      item: m.item,
      note: m.note,
      required: m.required,
      position: m.position,
      checked: checked.has(m.id),
    })),
    deliverables: (deliverables ?? []).map((d) => ({ id: d.id, title: d.title, description: d.description, dueDate: d.due_date, phase: d.phase, position: d.position })),
    resources: (resources ?? []).map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      kind: r.kind,
      title: r.title,
      description: r.description,
      url: r.url,
      filePath: r.file_path,
      body: r.body,
      phase: r.phase,
      requirement: r.requirement,
      availableFrom: r.available_from,
      status: r.status,
      position: r.position,
    })),
    internalNotes: notes?.notes ?? null,
  }
}

export async function loadFaculty(): Promise<FacultyRef[]> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return []
  const { data } = await supabase.from('faculty').select(FACULTY_COLS).order('display_name')
  return (data ?? []).map(toFaculty)
}
