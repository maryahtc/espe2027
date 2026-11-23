'use server'

import { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import type { ActionState } from '@/lib/admin/academic-actions'
import { requireUser } from '@/lib/auth/session'
import { trackingCohorts } from '@/lib/tracking/load'
import { CATEGORIES, PRIORITIES, STATUSES, type TaskCategory, type TaskPriority, type TaskStatus } from './model'
import { tasksReady } from './schema'

/**
 * Ações do quadro de pendências. Admin: cria e edita tudo. Coordenação: cria e edita só nas turmas que coordena; as
 * gerais são somente leitura. Ninguém exclui: encerrar = situação "cancelada" (histórico preservado). As conferências
 * aqui dão uma mensagem clara; a garantia é a RLS no banco.
 */
type Db = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

async function staff() {
  const auth = await requireUser(['admin', 'coordenacao'])
  const supabase = await createSupabaseServerClient()
  if (!auth || !supabase) throw new Error('Banco não configurado neste ambiente.')
  if (!(await tasksReady())) throw new Error('O quadro de pendências ainda não está disponível neste banco.')
  const allowed = auth.role === 'admin' ? null : new Set((await trackingCohorts(auth)).map((c) => c.id))
  return { auth, db: supabase as Db, allowed }
}

async function run(fn: (ctx: Awaited<ReturnType<typeof staff>>) => Promise<string | void>, ok = 'Salvo.'): Promise<ActionState> {
  try {
    const ctx = await staff()
    const msg = await fn(ctx)
    revalidatePath('/admin/pendencias')
    revalidatePath('/coordenacao/pendencias')
    revalidatePath('/admin')
    return { aviso: msg || ok }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
    return { erro: e instanceof Error ? e.message : 'Não foi possível salvar.' }
  }
}

function fail(error: { code?: string; message: string } | null) {
  if (!error) return
  if (error.code === '42501') throw new Error('Sem permissão para pendências desta turma.')
  if (error.code === '23514') {
    if (/módulo/i.test(error.message)) throw new Error('O módulo escolhido não é desta turma.')
    if (/mesma turma|dela mesma/i.test(error.message)) throw new Error('A dependência precisa ser outra pendência da mesma turma.')
    throw new Error('Confira os campos: link deve começar com https:// e quantidades não podem ser negativas.')
  }
  if (error.code === '23503') throw new Error('Algum item escolhido (turma, módulo, responsável ou dependência) não existe mais.')
  throw new Error('Não foi possível salvar a pendência.')
}

const str = (fd: FormData, k: string, max: number) => {
  const v = fd.get(k)
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
const opt = (fd: FormData, k: string, max: number) => str(fd, k, max) || null
const isId = (v: string) => /^[0-9a-f-]{36}$/.test(v)
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
const oneOf = <T extends string>(v: string, all: readonly T[], fallback: T): T => ((all as readonly string[]).includes(v) ? (v as T) : fallback)
function qty(fd: FormData, k: string): number | null {
  const v = str(fd, k, 20).replace(',', '.')
  if (!v) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) throw new Error('Quantidade precisa ser um número igual ou maior que zero.')
  return n
}

function fields(fd: FormData) {
  const title = str(fd, 'demanda', 200)
  if (!title) throw new Error('Escreva a demanda.')
  const cohort = str(fd, 'turma', 40)
  const moduleField = str(fd, 'modulo', 40)
  const responsible = str(fd, 'responsavel', 40)
  const due = str(fd, 'prazo', 10)
  const depends = str(fd, 'depende_de', 40)
  const link = str(fd, 'link', 500)
  if (due && !isDate(due)) throw new Error('Prazo inválido.')
  if (link && !/^https:\/\//i.test(link)) throw new Error('O link precisa começar com https://')
  return {
    title,
    cohort_id: isId(cohort) ? cohort : null,
    module_id: isId(moduleField) ? moduleField : null,
    category: oneOf<TaskCategory>(str(fd, 'categoria', 30), CATEGORIES, 'administrativo'),
    details: opt(fd, 'detalhes', 4000),
    responsible_id: isId(responsible) ? responsible : null,
    due_date: due || null,
    priority: oneOf<TaskPriority>(str(fd, 'prioridade', 10), PRIORITIES, 'media'),
    status: oneOf<TaskStatus>(str(fd, 'situacao', 20), STATUSES, 'aberta'),
    next_action: opt(fd, 'proxima_acao', 500),
    depends_on_id: isId(depends) ? depends : null,
    dependency_note: opt(fd, 'dependencia', 500),
    quantity_needed: qty(fd, 'qtd_necessaria'),
    quantity_available: qty(fd, 'qtd_disponivel'),
    partner_name: opt(fd, 'empresa', 200),
    link_url: link || null,
  }
}

/** Cria (sem "id") ou edita (com "id") uma pendência. */
export async function saveTask(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db, allowed }) => {
    const id = str(fd, 'id', 40)
    const row = fields(fd)
    if (allowed) {
      // Coordenação: sempre numa turma que coordena (o módulo define a turma quando informado).
      if (!row.cohort_id && !row.module_id) throw new Error('Escolha a turma da pendência.')
      if (row.cohort_id && !allowed.has(row.cohort_id)) throw new Error('Sem permissão para pendências desta turma.')
    }
    if (row.depends_on_id) {
      // Dependência só entre pendências da mesma turma (o banco recusa de qualquer forma; aqui a mensagem é clara).
      const { data: dep } = await db.from('admin_tasks').select('cohort_id').eq('id', row.depends_on_id).maybeSingle()
      const targetCohort = row.cohort_id ?? (row.module_id ? ((await db.from('modules').select('cohort_id').eq('id', row.module_id).maybeSingle()).data?.cohort_id ?? null) : null)
      if (!dep || dep.cohort_id !== targetCohort) throw new Error('A pendência escolhida em "Depende de" precisa ser da mesma turma (ou ambas gerais).')
    }
    if (id) {
      if (!isId(id)) throw new Error('Pendência inválida.')
      const { error, count } = await db.from('admin_tasks').update(row, { count: 'exact' }).eq('id', id)
      fail(error)
      if (!count) throw new Error('Pendência não encontrada ou sem permissão.')
      return 'Pendência atualizada.'
    }
    const { error } = await db.from('admin_tasks').insert(row)
    fail(error)
    return 'Pendência criada.'
  })
}

/** Troca rápida de situação (lista do quadro). */
export async function setTaskStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const id = str(fd, 'id', 40)
    if (!isId(id)) throw new Error('Pendência inválida.')
    const status = oneOf<TaskStatus>(str(fd, 'situacao', 20), STATUSES, 'aberta')
    const { error, count } = await db.from('admin_tasks').update({ status }, { count: 'exact' }).eq('id', id)
    fail(error)
    if (!count) throw new Error('Pendência não encontrada ou sem permissão.')
    return 'Situação atualizada.'
  })
}
