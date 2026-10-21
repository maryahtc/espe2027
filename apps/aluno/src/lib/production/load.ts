import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { loadMyCases, loadStepOptions, moduleSpans } from '@/lib/cases/load'
import type { cohortModules } from '@/lib/academic/load'
import { loadLibrary } from '@/lib/library/load'
import { type ContentVM, isReleased } from '@/lib/library/model'
import { productionBase } from './model'

/**
 * Tudo o que Minha Produção precisa, reaproveitando as cargas da Etapa 6: os casos do próprio aluno (na simulação, o
 * rascunho — nunca dados reais), o catálogo completo (inclusive itens desativados, para ler registros antigos) e o
 * cronograma publicado da turma. Nenhuma consulta nova de produção: tudo é derivado em `model.ts`.
 */
export async function loadProduction(userId: string, cohortId: string, modules: Awaited<ReturnType<typeof cohortModules>>) {
  const [cases, options] = await Promise.all([loadMyCases(userId), loadStepOptions()])
  const spans = moduleSpans(modules)
  return { cases, options, spans, base: productionBase(cases, cohortId, spans, options) }
}

/**
 * Biblioteca para "Áreas para explorar": procedimento → temas do procedimento (Admin → Procedimentos) → conteúdos
 * publicados e liberados para a turma com esses temas (a mesma regra dos conteúdos relacionados da página do caso).
 * Sem vínculo real → nada (nunca placeholder). Até `limit` por procedimento.
 */
export async function libraryForProcedures(procedureIds: string[], userId: string, cohortId: string, limit = 3): Promise<Map<string, ContentVM[]>> {
  const out = new Map<string, ContentVM[]>()
  if (!procedureIds.length) return out
  const supabase = await createSupabaseServerClient()
  if (!supabase) return out
  const { data: links } = await supabase.from('procedure_topics').select('procedure_id, topic_id').in('procedure_id', procedureIds)
  if (!links?.length) return out
  const library = (await loadLibrary(userId, cohortId)).filter((x) => isReleased(x) && (!x.cohortIds.length || x.cohortIds.includes(cohortId)))
  for (const pid of procedureIds) {
    const topics = new Set(links.filter((l) => l.procedure_id === pid).map((l) => l.topic_id))
    if (!topics.size) continue
    const list = library
      .filter((x) => x.topics.some((t) => topics.has(t.id)))
      .sort((a, b) => b.topics.filter((t) => topics.has(t.id)).length - a.topics.filter((t) => topics.has(t.id)).length)
      .slice(0, limit)
    if (list.length) out.set(pid, list)
  }
  return out
}
