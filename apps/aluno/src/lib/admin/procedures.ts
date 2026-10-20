import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import type { HistoryEntry } from '@/lib/admin/academic'
import { odontogramReady } from '@/lib/cases/schema'
import { frequentDescriptions, legacyLocation, type ProcedureVM, type StepLocation, type StepVM } from '@/lib/procedures/model'

async function client() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) throw new Error('Supabase não configurado.')
  return supabase
}

export type ProcedureCategoryVM = { id: string; name: string; slug: string; position: number; archived: boolean }

/** Catálogo completo para o Admin: categorias, procedimentos, etapas (com uso) e temas ligados. */
export async function adminCatalog(): Promise<{ categories: ProcedureCategoryVM[]; procedures: ProcedureVM[] }> {
  const supabase = await client()
  const [{ data: cats }, { data: procs }, { data: steps }, { data: links }, { data: uses }] = await Promise.all([
    supabase.from('procedure_categories').select('id, name, slug, position, archived_at').order('position'),
    supabase.from('procedures').select('id, category_id, name, slug, kind, synonyms, active, position').order('position'),
    supabase
      .from('procedure_steps')
      .select(`id, procedure_id, name, slug, unit, completes, requires_description, synonyms, active, position${(await odontogramReady()) ? ', location' : ''}`)
      .order('position')
      .returns<Array<{ id: string; procedure_id: string; name: string; slug: string; unit: StepVM['unit']; completes: boolean; requires_description: boolean; synonyms: string[] | null; active: boolean; position: number; location?: StepLocation }>>(),
    supabase.from('procedure_topics').select('procedure_id, topic_id'),
    supabase.from('performed_procedures').select('step_id'),
  ])
  const useCount = new Map<string, number>()
  for (const u of uses ?? []) useCount.set(u.step_id, (useCount.get(u.step_id) ?? 0) + 1)
  const stepsOf = new Map<string, StepVM[]>()
  for (const s of steps ?? []) {
    const list = stepsOf.get(s.procedure_id) ?? []
    list.push({
      id: s.id,
      procedureId: s.procedure_id,
      name: s.name,
      slug: s.slug,
      unit: s.unit,
      location: s.location ?? legacyLocation(s.unit),
      completes: s.completes,
      requiresDescription: s.requires_description,
      synonyms: s.synonyms ?? [],
      active: s.active,
      position: s.position,
      uses: useCount.get(s.id) ?? 0,
    })
    stepsOf.set(s.procedure_id, list)
  }
  const topicsOf = new Map<string, string[]>()
  for (const l of links ?? []) topicsOf.set(l.procedure_id, [...(topicsOf.get(l.procedure_id) ?? []), l.topic_id])
  return {
    categories: (cats ?? []).map((c) => ({ id: c.id, name: c.name, slug: c.slug, position: c.position, archived: !!c.archived_at })),
    procedures: (procs ?? []).map((p) => ({
      id: p.id,
      categoryId: p.category_id,
      name: p.name,
      slug: p.slug,
      kind: p.kind,
      synonyms: p.synonyms ?? [],
      active: p.active,
      position: p.position,
      steps: stepsOf.get(p.id) ?? [],
      topicIds: topicsOf.get(p.id) ?? [],
    })),
  }
}

const TABLE_LABEL: Record<string, string> = { procedures: 'Procedimento', procedure_steps: 'Etapa', procedure_categories: 'Categoria' }

/** Histórico "de → para" do procedimento e das etapas dele. */
export async function procedureHistory(procedure: ProcedureVM): Promise<HistoryEntry[]> {
  const supabase = await client()
  const rowIds = [procedure.id, ...procedure.steps.map((s) => s.id)]
  const { data } = await supabase
    .from('change_log')
    .select('id, at, actor, table_name, action, changes')
    .in('table_name', ['procedures', 'procedure_steps'])
    .in('row_id', rowIds)
    .order('at', { ascending: false })
    .limit(60)
  const actors = [...new Set((data ?? []).map((d) => d.actor).filter((a): a is string => Boolean(a)))]
  const { data: people } = actors.length ? await supabase.from('profiles').select('id, full_name, display_name').in('id', actors) : { data: [] }
  const names = new Map((people ?? []).map((p) => [p.id, p.display_name || p.full_name || 'Admin']))
  return (data ?? []).map((d) => ({
    id: d.id,
    at: d.at,
    actor: d.actor ? (names.get(d.actor) ?? 'Admin') : 'Catálogo inicial',
    table: TABLE_LABEL[d.table_name] ?? d.table_name,
    action: d.action,
    changes: (d.changes ?? {}) as Record<string, unknown>,
  }))
}

/** "Descrições frequentes" de uma etapa que exige descrição ("Outro procedimento"). */
export async function stepDescriptions(stepId: string) {
  const supabase = await client()
  const { data } = await supabase
    .from('performed_procedures')
    .select('other_description, other_description_norm, owner_id')
    .eq('step_id', stepId)
    .is('removed_at', null)
    .not('other_description_norm', 'is', null)
  return frequentDescriptions(
    (data ?? []).map((r) => ({ description: r.other_description ?? '', normalized: r.other_description_norm ?? '', ownerId: r.owner_id })),
  )
}
