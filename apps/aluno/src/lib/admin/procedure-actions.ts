'use server'

import { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { parseSynonyms, slugify } from '@/lib/library/model'
import { UNITS, type CountUnit } from '@/lib/procedures/model'

/**
 * Ações de Admin → Procedimentos. Só admin; a RLS confere de novo e o histórico registra quem mudou o quê.
 * Nada que já foi usado em registros é apagado: categoria arquiva, procedimento e etapa desativam.
 */
export type ActionState = { erro?: string; aviso?: string } | undefined

type Db = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>
const UUID = /^[0-9a-f-]{36}$/

async function admin(): Promise<Db> {
  const auth = await requireUser(['admin'])
  const supabase = await createSupabaseServerClient()
  if (!auth || !supabase) throw new Error('Banco não configurado neste ambiente.')
  return supabase
}

async function run(fn: (db: Db) => Promise<string | void>, ok = 'Salvo.'): Promise<ActionState> {
  try {
    const msg = await fn(await admin())
    revalidatePath('/admin/procedimentos', 'layout')
    return { aviso: msg || ok }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
    return { erro: e instanceof Error ? e.message : 'Não foi possível salvar.' }
  }
}

function fail(error: { code?: string; message: string } | null) {
  if (!error) return
  if (error.code === '23505' && error.message.includes('one_completion')) throw new Error('Este procedimento já tem uma etapa que conclui. Desmarque a outra antes.')
  if (error.code === '23505') throw new Error('Já existe um item com esse nome.')
  if (error.code === '23514' && /Procedimento/.test(error.message)) throw new Error(error.message)
  if (error.code === '23514') throw new Error('Algum valor está fora do permitido.')
  if (error.code === '23503') throw new Error('Este item já é usado em registros e não pode ser apagado — desative-o.')
  if (error.code === '42501') throw new Error('Sem permissão para esta ação.')
  throw new Error('Não foi possível salvar.')
}

const text = (fd: FormData, k: string, max = 300) => {
  const v = fd.get(k)
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
function req(fd: FormData, k: string, label: string, max = 120): string {
  const v = text(fd, k, max)
  if (!v) throw new Error(`Preencha: ${label}.`)
  return v
}
function id(fd: FormData, k = 'id'): string {
  const v = text(fd, k, 40)
  if (!UUID.test(v)) throw new Error('Registro inválido.')
  return v
}
const optId = (fd: FormData, k = 'id') => (UUID.test(text(fd, k, 40)) ? text(fd, k, 40) : null)
const checked = (fd: FormData, k: string) => fd.get(k) === 'on'
const position = (fd: FormData) => {
  const n = Number(text(fd, 'posicao', 4))
  return Number.isInteger(n) && n >= 0 ? n : 0
}
function unit(fd: FormData): CountUnit {
  const v = text(fd, 'unidade', 10) as CountUnit
  if (!UNITS.includes(v)) throw new Error('Escolha a unidade de contagem.')
  return v
}
const kind = (fd: FormData) => (text(fd, 'tipo', 20) === 'geral' ? 'geral' : 'tratamento')

async function uniqueSlug(db: Db, table: 'procedure_categories' | 'procedures', base: string): Promise<string> {
  const root = slugify(base)
  const { data } = await db.from(table).select('slug').like('slug', `${root}%`)
  const used = new Set((data ?? []).map((r) => r.slug))
  let slug = root
  for (let i = 2; used.has(slug); i++) slug = `${root}-${i}`
  return slug
}

// ─── Categorias ───────────────────────────────────────────────────────────────────────────────────
export async function saveProcedureCategory(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const name = req(fd, 'nome', 'nome da categoria', 80)
    const catId = optId(fd)
    const { error } = catId
      ? await db.from('procedure_categories').update({ name, position: position(fd) }).eq('id', catId)
      : await db.from('procedure_categories').insert({ name, slug: await uniqueSlug(db, 'procedure_categories', name), position: position(fd) })
    fail(error)
    return catId ? 'Categoria salva.' : 'Categoria criada.'
  })
}

export async function setProcedureCategoryArchived(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const archive = text(fd, 'arquivar', 4) === 'sim'
    const { error } = await db.from('procedure_categories').update({ archived_at: archive ? new Date().toISOString() : null }).eq('id', id(fd))
    fail(error)
    return archive ? 'Categoria arquivada (sai da lista de novas escolhas; nada é apagado).' : 'Categoria restaurada.'
  })
}

// ─── Procedimentos ────────────────────────────────────────────────────────────────────────────────
/** Novo procedimento já com a primeira etapa (procedimento simples = etapa única com o mesmo nome). */
export async function createProcedure(_: ActionState, fd: FormData): Promise<ActionState> {
  const created: { id?: string } = {}
  const result = await run(async (db) => {
    const name = req(fd, 'nome', 'nome do procedimento')
    const k = kind(fd)
    const completes = k === 'tratamento' && checked(fd, 'conclui')
    const { data, error } = await db
      .from('procedures')
      .insert({
        category_id: id(fd, 'categoria'),
        name,
        slug: await uniqueSlug(db, 'procedures', name),
        kind: k,
        synonyms: parseSynonyms(text(fd, 'sinonimos', 2000), name),
        position: position(fd),
      })
      .select('id')
      .single()
    fail(error)
    const stepName = text(fd, 'etapa', 80) || name
    const { error: stepError } = await db
      .from('procedure_steps')
      .insert({ procedure_id: data!.id, name: stepName, slug: slugify(stepName), unit: unit(fd), completes, position: 1 })
    if (stepError) {
      await db.from('procedures').delete().eq('id', data!.id)
      fail(stepError)
    }
    created.id = data!.id
  }, 'Procedimento criado.')
  if (created.id && !result?.erro) redirect(`/admin/procedimentos/${created.id}?criado=1`)
  return result
}

export async function saveProcedure(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const name = req(fd, 'nome', 'nome do procedimento')
    const { error } = await db
      .from('procedures')
      .update({
        category_id: id(fd, 'categoria'),
        name,
        kind: kind(fd),
        synonyms: parseSynonyms(text(fd, 'sinonimos', 2000), name),
        position: position(fd),
        active: checked(fd, 'ativo'),
      })
      .eq('id', id(fd))
    fail(error)
    return 'Procedimento salvo.'
  })
}

export async function saveProcedureTopics(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const procId = id(fd)
    const wanted = [...new Set(fd.getAll('temas').map(String).filter((v) => UUID.test(v)))]
    const { data: current } = await db.from('procedure_topics').select('topic_id').eq('procedure_id', procId)
    const have = new Set((current ?? []).map((r) => r.topic_id))
    const add = wanted.filter((t) => !have.has(t))
    const remove = [...have].filter((t) => !wanted.includes(t))
    if (add.length) fail((await db.from('procedure_topics').insert(add.map((topic_id) => ({ procedure_id: procId, topic_id })))).error)
    if (remove.length) fail((await db.from('procedure_topics').delete().eq('procedure_id', procId).in('topic_id', remove)).error)
    return 'Temas relacionados salvos.'
  })
}

// ─── Etapas ───────────────────────────────────────────────────────────────────────────────────────
export async function saveStep(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const name = req(fd, 'nome', 'nome da etapa', 80)
    const row = {
      name,
      unit: unit(fd),
      completes: checked(fd, 'conclui'),
      requires_description: checked(fd, 'descricao'),
      synonyms: parseSynonyms(text(fd, 'sinonimos', 2000), name),
      position: position(fd),
    }
    const stepId = optId(fd)
    if (stepId) {
      const { error } = await db.from('procedure_steps').update({ ...row, active: checked(fd, 'ativo') }).eq('id', stepId)
      fail(error)
      return 'Etapa salva.'
    }
    const procId = id(fd, 'procedimento')
    const { data: same } = await db.from('procedure_steps').select('slug').eq('procedure_id', procId)
    const used = new Set((same ?? []).map((s) => s.slug))
    let slug = slugify(name)
    for (let i = 2; used.has(slug); i++) slug = `${slugify(name)}-${i}`
    const { error } = await db.from('procedure_steps').insert({ ...row, procedure_id: procId, slug })
    fail(error)
    return 'Etapa criada.'
  })
}

/** Apaga etapa nunca usada; a usada só pode ser desativada (o banco impede apagar). */
export async function deleteStep(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const stepId = id(fd)
    const { count } = await db.from('performed_procedures').select('id', { count: 'exact', head: true }).eq('step_id', stepId)
    if (count) throw new Error('Esta etapa já tem registros: desative-a em vez de apagar.')
    const { data: step } = await db.from('procedure_steps').select('procedure_id').eq('id', stepId).maybeSingle()
    const { count: siblings } = await db.from('procedure_steps').select('id', { count: 'exact', head: true }).eq('procedure_id', step?.procedure_id ?? '')
    if ((siblings ?? 0) <= 1) throw new Error('O procedimento precisa de pelo menos uma etapa.')
    fail((await db.from('procedure_steps').delete().eq('id', stepId)).error)
    return 'Etapa apagada.'
  })
}
