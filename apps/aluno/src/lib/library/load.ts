import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { cache } from 'react'
import type { ContentStatus, ModulePhase, RequirementLevel } from '@/lib/academic/model'
import { getSimulation } from '@/lib/simulation/session'
import { contentVisible } from '@/lib/simulation/visibility'
import type { AttachmentVM, CategoryVM, ContentKind, ContentVM, ProgressStatus, TopicVM } from './model'

export const CONTENT_COLS = `id, kind, title, slug, description, category_id, citation, url, file_path, file_name, video_id,
  video_status, thumbnail_url, duration_seconds, available_from, status, published_at, updated_at,
  categories(name),
  content_topics(topics(id, name, slug)),
  content_faculty(position, faculty(id, display_name, honorific)),
  content_cohorts(cohort_id),
  module_contents(module_id, phase, requirement, position, note, modules(id, cohort_id, number, title, theme))`

export type ContentRow = {
  id: string
  kind: ContentKind
  title: string
  slug: string
  description: string | null
  category_id: string
  citation: string | null
  url: string | null
  file_path: string | null
  file_name: string | null
  video_id: string | null
  video_status: string | null
  thumbnail_url: string | null
  duration_seconds: number | null
  available_from: string | null
  status: ContentStatus
  published_at: string | null
  updated_at: string
  categories: { name: string } | null
  content_topics: Array<{ topics: { id: string; name: string; slug: string } | null }>
  content_faculty: Array<{ position: number; faculty: { id: string; display_name: string; honorific: string | null } | null }>
  content_cohorts: Array<{ cohort_id: string }>
  module_contents: Array<{
    module_id: string
    phase: ModulePhase
    requirement: RequirementLevel
    position: number
    note: string | null
    modules: { id: string; cohort_id: string; number: number | null; title: string; theme: string | null } | null
  }>
}

type ProgressRow = { content_id: string; status: ProgressStatus; percent: number; position_seconds: number; completed_at: string | null; updated_at: string }

export function toContent(r: ContentRow, progress?: ProgressRow): ContentVM {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    slug: r.slug,
    description: r.description,
    categoryId: r.category_id,
    category: r.categories?.name ?? '',
    citation: r.citation,
    url: r.url,
    filePath: r.file_path,
    fileName: r.file_name,
    videoId: r.video_id,
    videoStatus: r.video_status,
    thumbnailUrl: r.thumbnail_url,
    durationSeconds: r.duration_seconds,
    availableFrom: r.available_from,
    status: r.status,
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
    topics: r.content_topics
      .map((ct) => ct.topics)
      .filter((t): t is NonNullable<typeof t> => !!t)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    faculty: [...r.content_faculty]
      .sort((a, b) => a.position - b.position)
      .map((cf) => cf.faculty)
      .filter((f): f is NonNullable<typeof f> => !!f)
      .map((f) => ({ id: f.id, name: f.display_name, honorific: f.honorific })),
    cohortIds: r.content_cohorts.map((c) => c.cohort_id),
    modules: r.module_contents
      .filter((mc) => mc.modules)
      .map((mc) => ({
        moduleId: mc.module_id,
        cohortId: mc.modules!.cohort_id,
        number: mc.modules!.number,
        title: mc.modules!.title,
        theme: mc.modules!.theme,
        phase: mc.phase,
        requirement: mc.requirement,
        position: mc.position,
        note: mc.note,
      }))
      .sort((a, b) => (a.number ?? 999) - (b.number ?? 999)),
    progress: progress
      ? { status: progress.status, percent: progress.percent, positionSeconds: progress.position_seconds, completedAt: progress.completed_at, updatedAt: progress.updated_at }
      : null,
  }
}

/** Áreas e temas (ativos, salvo `withArchived`). Vazio sem Supabase. */
export const loadTaxonomy = cache(async (withArchived = false): Promise<{ categories: CategoryVM[]; topics: TopicVM[] }> => {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { categories: [], topics: [] }
  const [{ data: cats }, { data: tops }] = await Promise.all([
    supabase.from('categories').select('id, name, slug, position, archived_at').order('position').order('name'),
    supabase.from('topics').select('id, category_id, name, slug, description, synonyms, archived_at, merged_into').order('name'),
  ])
  const categories = (cats ?? [])
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, position: c.position, archived: !!c.archived_at }))
    .filter((c) => withArchived || !c.archived)
  const topics = (tops ?? [])
    .map((t) => ({
      id: t.id,
      categoryId: t.category_id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      synonyms: t.synonyms ?? [],
      archived: !!t.archived_at,
      mergedInto: t.merged_into,
    }))
    .filter((t) => withArchived || !t.archived)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  return { categories, topics }
})

/**
 * Biblioteca da pessoa: conteúdos publicados que a RLS deixa ver, com o progresso dela.
 * `cohortId` restringe os vínculos com módulos à turma em exibição.
 */
export const loadLibrary = cache(async (userId: string | null, cohortId: string | null): Promise<ContentVM[]> => {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return []
  const sim = await getSimulation()
  if (sim) {
    // Simulação: só o que o aluno da turma pode ler; progresso do rascunho (nunca o do Admin).
    const [{ data, error }, { data: published }] = await Promise.all([
      supabase.from('contents').select(CONTENT_COLS).eq('status', 'publicado').order('published_at', { ascending: false }),
      // Vínculos com módulos: o aluno só enxerga os de módulos publicados da turma.
      supabase.from('modules').select('id').eq('cohort_id', sim.cohortVM.id).eq('status', 'publicado'),
    ])
    if (error) throw new Error(`Falha ao carregar a biblioteca: ${error.message}`)
    const visibleModules = new Set((published ?? []).map((m) => m.id))
    return (data as unknown as ContentRow[])
      .map((r) => {
        const p = sim.state.progress[r.id]
        const row = p
          ? { content_id: r.id, status: p.status, percent: p.percent, position_seconds: p.positionSeconds, completed_at: p.completedAt, updated_at: p.updatedAt }
          : undefined
        const c = toContent(r, row)
        c.modules = c.modules.filter((m) => m.cohortId === sim.cohortVM.id && visibleModules.has(m.moduleId))
        return c
      })
      .filter((c) => contentVisible(c, sim.cohortVM.id))
  }
  const [{ data, error }, { data: progress }] = await Promise.all([
    supabase.from('contents').select(CONTENT_COLS).eq('status', 'publicado').order('published_at', { ascending: false }),
    userId
      ? supabase.from('content_progress').select('content_id, status, percent, position_seconds, completed_at, updated_at').eq('user_id', userId)
      : Promise.resolve({ data: [] as ProgressRow[] }),
  ])
  if (error) throw new Error(`Falha ao carregar a biblioteca: ${error.message}`)
  const byContent = new Map((progress ?? []).map((p) => [p.content_id, p as ProgressRow]))
  return (data as unknown as ContentRow[]).map((r) => {
    const c = toContent(r, byContent.get(r.id))
    if (cohortId) c.modules = c.modules.filter((m) => m.cohortId === cohortId)
    return c
  })
})

/** Ids encontrados pela busca do banco (sem acento, temas, sinônimos, professores), por relevância. */
export async function searchLibrary(q: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient()
  if (!supabase || !q.trim()) return []
  const { data } = await supabase.rpc('search_library', { p_query: q })
  return (data ?? []).map((r: { content_id: string }) => r.content_id)
}

export async function loadAttachments(contentId: string): Promise<AttachmentVM[]> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return []
  const { data } = await supabase
    .from('content_attachments')
    .select('id, title, file_path, file_name, url, position')
    .eq('content_id', contentId)
    .order('position')
  return (data ?? []).map((a) => ({ id: a.id, title: a.title, filePath: a.file_path, fileName: a.file_name, url: a.url, position: a.position }))
}
