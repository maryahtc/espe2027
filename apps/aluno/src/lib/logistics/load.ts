import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { today } from '@/lib/academic/load'
import type { CohortVM } from '@/lib/academic/model'
import type { AuthState } from '@/lib/auth/session'
import { addDays } from '@/lib/dates'
import { trackingCohorts } from '@/lib/tracking/load'
import { DEFAULT_LOGISTICS, type Logistics, type LogisticsSummary, moduleTeachers, summarize } from './model'
import { logisticsReady } from './schema'

/**
 * Cargas de professores e logística, sempre pela sessão de quem está logado (RLS): Admin vê e edita tudo; coordenação
 * consulta só os módulos (e os contatos) da turma que coordena. Só lê a programação acadêmica, nunca a altera.
 */

export type TeacherRow = {
  facultyId: string
  name: string
  fullName: string
  kind: string
  /** Onde aparece no módulo: equipe (papel) e/ou atividades. */
  inStaff: string | null
  inSessions: number
  contact: { email: string | null; phone: string | null; city: string | null; notes: string | null } | null
  logistics: Logistics
}
export type ModuleLogistics = {
  id: string
  cohortId: string
  cohortName: string
  label: string
  title: string
  start: string | null
  end: string | null
  rows: TeacherRow[]
  summary: LogisticsSummary
}
export type PersonOption = { key: string; name: string; group: 'academica' | 'operacional'; active: boolean }
export type LogisticsBoard = {
  admin: boolean
  cohorts: CohortVM[]
  cohortId: string | null
  scope: Scope
  modules: ModuleLogistics[]
  summary: LogisticsSummary
  people: PersonOption[]
  faculty: Array<{ id: string; name: string; active: boolean }>
}
export type Scope = 'proximos' | 'futuros' | 'todos'

type LRow = {
  id: string
  module_id: string
  faculty_id: string
  participation: Logistics['participation']
  invited_on: string | null
  answered_on: string | null
  travel: Logistics['travel']
  travel_arrival: string | null
  travel_departure: string | null
  travel_locator: string | null
  travel_receipt_url: string | null
  travel_responsible_id: string | null
  travel_responsible_ops_id: string | null
  travel_waiting_on: string | null
  travel_notes: string | null
  lodging: Logistics['lodging']
  lodging_name: string | null
  check_in: string | null
  check_out: string | null
  lodging_locator: string | null
  lodging_receipt_url: string | null
  lodging_responsible_id: string | null
  lodging_responsible_ops_id: string | null
  lodging_waiting_on: string | null
  lodging_notes: string | null
  notes: string | null
}
const key = (f: string | null, o: string | null) => (f ? `f:${f}` : o ? `o:${o}` : null)
const toLogistics = (r: LRow): Logistics => ({
  id: r.id,
  moduleId: r.module_id,
  facultyId: r.faculty_id,
  participation: r.participation,
  invitedOn: r.invited_on,
  answeredOn: r.answered_on,
  travel: r.travel,
  travelArrival: r.travel_arrival,
  travelDeparture: r.travel_departure,
  travelLocator: r.travel_locator,
  travelReceiptUrl: r.travel_receipt_url,
  travelResponsible: key(r.travel_responsible_id, r.travel_responsible_ops_id),
  travelWaitingOn: r.travel_waiting_on,
  travelNotes: r.travel_notes,
  lodging: r.lodging,
  lodgingName: r.lodging_name,
  checkIn: r.check_in,
  checkOut: r.check_out,
  lodgingLocator: r.lodging_locator,
  lodgingReceiptUrl: r.lodging_receipt_url,
  lodgingResponsible: key(r.lodging_responsible_id, r.lodging_responsible_ops_id),
  lodgingWaitingOn: r.lodging_waiting_on,
  lodgingNotes: r.lodging_notes,
  notes: r.notes,
})
const STAFF_LABEL: Record<string, string> = { principal: 'Principal', docente: 'Docente', equipe_clinica: 'Equipe clínica', coordenacao: 'Coordenação', apoio: 'Apoio' }

export async function loadLogisticsBoard(
  auth: AuthState,
  opts: { cohortId?: string; scope?: Scope; facultyId?: string; withinDays?: number } = {},
): Promise<LogisticsBoard | null> {
  if (auth.role !== 'admin' && auth.role !== 'coordenacao') return null
  if (!(await logisticsReady())) return null
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null
  const cohorts = (await trackingCohorts(auth)).filter((c) => c.status === 'ativa')
  const cohortIds = opts.cohortId ? cohorts.filter((c) => c.id === opts.cohortId).map((c) => c.id) : cohorts.map((c) => c.id)
  const scope: Scope = opts.scope ?? 'proximos'
  const day = today()
  const empty = summarize([])
  const [{ data: fac }, { data: ops }] = await Promise.all([
    supabase.from('faculty').select('id, display_name, full_name, kind, active').order('display_name'),
    supabase.from('ops_people').select('id, name, role_title, active').order('name'),
  ])
  const people: PersonOption[] = [
    ...(ops ?? []).map((o) => ({ key: `o:${o.id}`, name: o.role_title ? `${o.name} (${o.role_title})` : o.name, group: 'operacional' as const, active: o.active })),
    ...(fac ?? []).map((f) => ({ key: `f:${f.id}`, name: f.display_name, group: 'academica' as const, active: f.active })),
  ]
  const faculty = (fac ?? []).map((f) => ({ id: f.id, name: f.display_name, active: f.active }))
  if (!cohortIds.length) return { admin: auth.role === 'admin', cohorts, cohortId: opts.cohortId ?? null, scope, modules: [], summary: empty, people, faculty }

  const { data: mods } = await supabase
    .from('modules')
    .select('id, cohort_id, number, title, position, module_days(date), module_staff(faculty_id, role)')
    .in('cohort_id', cohortIds)
    .neq('status', 'arquivado')
    .order('position')
  type M = { id: string; cohort_id: string; number: number | null; title: string; position: number; module_days: Array<{ date: string }>; module_staff: Array<{ faculty_id: string; role: string }> }
  let list = ((mods ?? []) as unknown as M[]).map((m) => {
    const dates = m.module_days.map((d) => d.date).sort()
    return { ...m, start: dates[0] ?? null, end: dates.at(-1) ?? null }
  })
  list.sort((a, b) => (a.start ?? '9999').localeCompare(b.start ?? '9999') || a.position - b.position)
  if (scope !== 'todos') list = list.filter((m) => !m.end || m.end >= day)
  if (opts.withinDays != null) list = list.filter((m) => m.start && m.start <= addDays(day, opts.withinDays!))
  if (scope === 'proximos' && opts.withinDays == null && !opts.facultyId) list = list.slice(0, 4)
  const ids = list.map((m) => m.id)
  const [{ data: sf }, { data: lrows }, { data: contacts }] = ids.length
    ? await Promise.all([
        supabase.from('session_faculty').select('module_id, faculty_id').in('module_id', ids),
        supabase.from('module_faculty_logistics').select('*').in('module_id', ids).returns<LRow[]>(),
        supabase.from('faculty_contacts').select('faculty_id, email, phone, city, notes'),
      ])
    : [{ data: [] }, { data: [] as LRow[] }, { data: [] }]
  const facById = new Map((fac ?? []).map((f) => [f.id, f]))
  const contactBy = new Map((contacts ?? []).map((c) => [c.faculty_id, { email: c.email, phone: c.phone, city: c.city, notes: c.notes }]))
  const cohortName = new Map(cohorts.map((c) => [c.id, c.name]))

  const modules: ModuleLogistics[] = list.map((m) => {
    const sessions = (sf ?? []).filter((x) => x.module_id === m.id)
    const logs = (lrows ?? []).filter((x) => x.module_id === m.id)
    const ids2 = moduleTeachers(
      m.module_staff.map((s) => s.faculty_id),
      sessions.map((s) => s.faculty_id),
      logs.map((l) => l.faculty_id),
    ).filter((fid) => !opts.facultyId || fid === opts.facultyId)
    const rows: TeacherRow[] = ids2
      .map((fid) => {
        const f = facById.get(fid)
        const staff = m.module_staff.find((s) => s.faculty_id === fid)
        const l = logs.find((x) => x.faculty_id === fid)
        return {
          facultyId: fid,
          name: f?.display_name ?? 'Docente',
          fullName: f?.full_name ?? '',
          kind: f?.kind ?? 'docente',
          inStaff: staff ? (STAFF_LABEL[staff.role] ?? staff.role) : null,
          inSessions: sessions.filter((s) => s.faculty_id === fid).length,
          contact: contactBy.get(fid) ?? null,
          logistics: l ? toLogistics(l) : DEFAULT_LOGISTICS(m.id, fid),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    return {
      id: m.id,
      cohortId: m.cohort_id,
      cohortName: cohortName.get(m.cohort_id) ?? '',
      label: m.number ? `Módulo ${String(m.number).padStart(2, '0')}` : m.title,
      title: m.title,
      start: m.start,
      end: m.end,
      rows,
      summary: summarize(rows.map((r) => r.logistics)),
    }
  })
  const visible = opts.facultyId ? modules.filter((m) => m.rows.length) : modules
  return {
    admin: auth.role === 'admin',
    cohorts,
    cohortId: opts.cohortId ?? null,
    scope,
    modules: visible,
    summary: summarize(visible.flatMap((m) => m.rows.map((r) => r.logistics))),
    people,
    faculty,
  }
}
