import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import type { HistoryEntry } from '@/lib/admin/academic'
import { getSimulation } from '@/lib/simulation/session'
import type { AnnouncementVM } from './model'

const COLS = `id, cohort_id, title, body, signature, link_url, link_label, important, visible_from, visible_until, status,
  published_at, updated_at, cohorts(name)`

type Row = {
  id: string
  cohort_id: string | null
  title: string
  body: string
  signature: string | null
  link_url: string | null
  link_label: string | null
  important: boolean
  visible_from: string
  visible_until: string
  status: AnnouncementVM['status']
  published_at: string | null
  updated_at: string
  cohorts: { name: string } | null
}

function toVM(r: Row): AnnouncementVM {
  return {
    id: r.id,
    cohortId: r.cohort_id,
    cohortName: r.cohorts?.name ?? null,
    title: r.title,
    body: r.body,
    signature: r.signature,
    linkUrl: r.link_url,
    linkLabel: r.link_label,
    important: r.important,
    visibleFrom: r.visible_from,
    visibleUntil: r.visible_until,
    status: r.status,
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
  }
}

/**
 * Avisos para a Início de uma turma (os da turma e os "para todas") e os "Entendi" da pessoa.
 * A RLS só entrega ao aluno o publicado e no período; admin e coordenação recebem mais, e a Início filtra pela data
 * (é o que permite a pré-visualização do admin numa data futura).
 */
export async function loadHomeAnnouncements(cohortId: string, userId: string | null): Promise<{ list: AnnouncementVM[]; dismissed: Set<string> }> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { list: [], dismissed: new Set() }
  const sim = await getSimulation()
  if (sim) {
    // Simulação: avisos da turma simulada (ou "todas"); "Entendi" só do rascunho. O período é filtrado no Início.
    const { data } = await supabase.from('announcements').select(COLS).eq('status', 'publicado').or(`cohort_id.eq.${sim.cohortVM.id},cohort_id.is.null`)
    return { list: ((data ?? []) as unknown as Row[]).map(toVM), dismissed: new Set(sim.state.dismissed) }
  }
  const [{ data }, { data: dismissals }] = await Promise.all([
    supabase.from('announcements').select(COLS).eq('status', 'publicado').or(`cohort_id.eq.${cohortId},cohort_id.is.null`),
    userId ? supabase.from('announcement_dismissals').select('announcement_id').eq('user_id', userId) : Promise.resolve({ data: [] }),
  ])
  return {
    list: ((data ?? []) as unknown as Row[]).map(toVM),
    dismissed: new Set((dismissals ?? []).map((d) => d.announcement_id)),
  }
}

/** Avisos do painel. `cohortIds` null = todas (admin); para a coordenação, só as turmas dela (a RLS confere de novo). */
export async function loadAdminAnnouncements(cohortIds: string[] | null): Promise<AnnouncementVM[]> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return []
  let q = supabase.from('announcements').select(COLS)
  if (cohortIds) q = q.in('cohort_id', cohortIds.length ? cohortIds : ['00000000-0000-0000-0000-000000000000'])
  const { data, error } = await q.order('visible_from', { ascending: false })
  if (error) throw new Error(`Falha ao carregar avisos: ${error.message}`)
  return ((data ?? []) as unknown as Row[]).map(toVM)
}

export async function loadAnnouncement(id: string): Promise<AnnouncementVM | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null
  const { data } = await supabase.from('announcements').select(COLS).eq('id', id).maybeSingle()
  return data ? toVM(data as unknown as Row) : null
}

/** Histórico "de → para" do aviso (a RLS do change_log: admin tudo; coordenação, só a própria turma). */
export async function announcementHistory(id: string): Promise<HistoryEntry[]> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return []
  const { data } = await supabase
    .from('change_log')
    .select('id, at, actor, action, changes')
    .eq('table_name', 'announcements')
    .eq('row_id', id)
    .order('at', { ascending: false })
    .limit(40)
  const actors = [...new Set((data ?? []).map((d) => d.actor).filter((a): a is string => Boolean(a)))]
  const { data: people } = actors.length ? await supabase.from('profiles').select('id, full_name, display_name').in('id', actors) : { data: [] }
  const names = new Map((people ?? []).map((p) => [p.id, p.display_name || p.full_name || 'Equipe']))
  return (data ?? []).map((d) => ({
    id: d.id,
    at: d.at,
    actor: d.actor ? (names.get(d.actor) ?? 'Equipe') : 'Sistema',
    table: 'Aviso',
    action: d.action,
    changes: (d.changes ?? {}) as Record<string, unknown>,
  }))
}
