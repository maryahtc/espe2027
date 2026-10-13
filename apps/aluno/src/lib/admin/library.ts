import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import type { HistoryEntry } from '@/lib/admin/academic'
import { refreshPendingVideos, refreshVideoState } from '@/lib/video/refresh'
import { CONTENT_COLS, type ContentRow, loadAttachments, loadTaxonomy, toContent } from '@/lib/library/load'
import type { AttachmentVM, CategoryVM, ContentVM, TopicVM } from '@/lib/library/model'

async function client() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) throw new Error('Supabase não configurado.')
  return supabase
}

/** Todos os conteúdos (rascunho, publicado, arquivado), mais recentes primeiro. Vazio sem Supabase. */
export async function adminContents(): Promise<ContentVM[]> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return []
  await refreshPendingVideos(supabase)
  const { data, error } = await supabase.from('contents').select(CONTENT_COLS).order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as unknown as ContentRow[]).map((r) => toContent(r))
}

export type ModuleOption = { id: string; cohortId: string; cohortName: string; number: number | null; title: string; theme: string | null; status: string }

export type AdminContentPage = {
  content: ContentVM
  attachments: AttachmentVM[]
  categories: CategoryVM[]
  topics: TopicVM[]
  faculty: Array<{ id: string; name: string; honorific: string | null; active: boolean }>
  cohorts: Array<{ id: string; name: string; status: string }>
  modules: ModuleOption[]
  history: HistoryEntry[]
}

export async function loadAdminContent(id: string): Promise<AdminContentPage | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const supabase = await client()
  await refreshVideoState(supabase, id).catch(() => undefined)
  const { data: row } = await supabase.from('contents').select(CONTENT_COLS).eq('id', id).maybeSingle()
  if (!row) return null
  const [attachments, { categories, topics }, { data: faculty }, { data: cohorts }, { data: modules }, history] = await Promise.all([
    loadAttachments(id),
    loadTaxonomy(),
    supabase.from('faculty').select('id, display_name, honorific, active').order('display_name'),
    supabase.from('cohorts').select('id, name, status').order('starts_on', { ascending: false }),
    supabase.from('modules').select('id, cohort_id, number, title, theme, status, position, cohorts(name)').neq('status', 'arquivado').order('position'),
    contentHistory(id),
  ])
  return {
    content: toContent(row as unknown as ContentRow),
    attachments,
    categories,
    topics,
    faculty: (faculty ?? []).map((f) => ({ id: f.id, name: f.display_name, honorific: f.honorific, active: f.active })),
    cohorts: cohorts ?? [],
    modules: (modules ?? []).map((m) => ({
      id: m.id,
      cohortId: m.cohort_id,
      cohortName: (m.cohorts as unknown as { name: string } | null)?.name ?? '',
      number: m.number,
      title: m.title,
      theme: m.theme,
      status: m.status,
    })),
    history,
  }
}

const TABLE_LABEL: Record<string, string> = {
  contents: 'Conteúdo',
  content_topics: 'Tema',
  content_faculty: 'Professor',
  content_attachments: 'Material complementar',
  content_cohorts: 'Turma',
  module_contents: 'Módulo',
}

export async function contentHistory(contentId: string, limit = 40): Promise<HistoryEntry[]> {
  const supabase = await client()
  const { data } = await supabase
    .from('change_log')
    .select('id, at, actor, table_name, action, changes')
    .eq('content_id', contentId)
    .order('at', { ascending: false })
    .limit(limit)
  const actors = [...new Set((data ?? []).map((d) => d.actor).filter((a): a is string => Boolean(a)))]
  const { data: people } = actors.length ? await supabase.from('profiles').select('id, full_name, display_name').in('id', actors) : { data: [] }
  const names = new Map((people ?? []).map((p) => [p.id, p.display_name || p.full_name || 'Admin']))
  return (data ?? []).map((d) => ({
    id: d.id,
    at: d.at,
    actor: d.actor ? (names.get(d.actor) ?? 'Admin') : 'Sistema',
    table: TABLE_LABEL[d.table_name] ?? d.table_name,
    action: d.action,
    changes: (d.changes ?? {}) as Record<string, unknown>,
  }))
}

export type AdminTopic = TopicVM & { origin: string | null; contents: number }

/** Taxonomia completa para o painel (com arquivados, origem interna e quantos conteúdos usam cada tema). */
export async function adminTaxonomy(): Promise<{ categories: CategoryVM[]; topics: AdminTopic[] }> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { categories: [], topics: [] }
  const [{ categories, topics }, { data: notes }, { data: links }] = await Promise.all([
    loadTaxonomy(true),
    supabase.from('topic_notes').select('topic_id, origin'),
    supabase.from('content_topics').select('topic_id'),
  ])
  const origin = new Map((notes ?? []).map((n) => [n.topic_id, n.origin]))
  const count = new Map<string, number>()
  for (const l of links ?? []) count.set(l.topic_id, (count.get(l.topic_id) ?? 0) + 1)
  return { categories, topics: topics.map((t) => ({ ...t, origin: origin.get(t.id) || null, contents: count.get(t.id) ?? 0 })) }
}

/** Conteúdos ligados a um módulo (painel do módulo), e as opções para ligar mais. */
export async function moduleLibrary(moduleId: string): Promise<{ linked: ContentVM[]; options: Array<{ id: string; title: string; status: string; kind: string }> }> {
  const supabase = await client()
  const [{ data: linked }, { data: options }] = await Promise.all([
    supabase.from('contents').select(CONTENT_COLS),
    supabase.from('contents').select('id, title, status, kind').neq('status', 'arquivado').order('title'),
  ])
  return {
    linked: (linked as unknown as ContentRow[])
      .map((r) => toContent(r))
      .filter((c) => c.modules.some((m) => m.moduleId === moduleId))
      .map((c) => ({ ...c, modules: c.modules.filter((m) => m.moduleId === moduleId) }))
      .sort((a, b) => a.modules[0]!.position - b.modules[0]!.position || a.title.localeCompare(b.title, 'pt-BR')),
    options: options ?? [],
  }
}
