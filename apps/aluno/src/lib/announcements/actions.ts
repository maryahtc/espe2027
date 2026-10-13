'use server'

import { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ActionState } from '@/lib/admin/academic-actions'
import { requireUser } from '@/lib/auth/session'
import { trackingCohorts } from '@/lib/tracking/load'
import { validLink } from './model'

/**
 * Ações dos avisos. Admin: qualquer turma ou todas. Coordenação: só as turmas que coordena (nunca "todas").
 * A conferência aqui é para dar uma mensagem clara; a garantia é a RLS no banco.
 */
type Db = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

async function staff() {
  const auth = await requireUser(['admin', 'coordenacao'])
  const supabase = await createSupabaseServerClient()
  if (!auth || !supabase) throw new Error('Banco não configurado neste ambiente.')
  const allowed = auth.role === 'admin' ? null : new Set((await trackingCohorts(auth)).map((c) => c.id))
  return { auth, db: supabase as Db, allowed }
}

async function run(fn: (ctx: Awaited<ReturnType<typeof staff>>) => Promise<string | void>, ok = 'Salvo.'): Promise<ActionState> {
  try {
    const ctx = await staff()
    const msg = await fn(ctx)
    revalidatePath('/', 'layout')
    return { aviso: msg || ok }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e // redirect/notFound do Next
    return { erro: e instanceof Error ? e.message : 'Não foi possível salvar.' }
  }
}

function fail(error: { code?: string; message: string } | null) {
  if (!error) return
  if (error.code === '42501') throw new Error('Sem permissão para avisos desta turma.')
  if (error.code === '23514') throw new Error('Confira os campos: "exibir até" não pode ser antes de "exibir de", e o link precisa começar com https:// ou /.')
  throw new Error('Não foi possível salvar o aviso.')
}

const str = (fd: FormData, k: string, max: number) => {
  const v = fd.get(k)
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
const isId = (v: string) => /^[0-9a-f-]{36}$/.test(v)
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)

/** Base do painel de quem está agindo (para voltar à lista certa). */
const base = (role: string) => (role === 'admin' ? '/admin/avisos' : '/coordenacao/avisos')

export async function saveAnnouncement(_: ActionState, fd: FormData): Promise<ActionState> {
  const created: { id?: string; role?: string } = {}
  const result = await run(async ({ auth, db, allowed }) => {
    const title = str(fd, 'titulo', 120)
    const body = str(fd, 'texto', 1000)
    const from = str(fd, 'de', 10)
    const until = str(fd, 'ate', 10)
    const turma = str(fd, 'turma', 40)
    const link = str(fd, 'link', 500)
    if (!title) throw new Error('Preencha: título.')
    if (!body) throw new Error('Preencha: texto do aviso.')
    if (!isDate(from) || !isDate(until)) throw new Error('Informe as datas de exibição (de e até).')
    if (until < from) throw new Error('"Exibir até" não pode ser antes de "exibir de".')
    if (link && !validLink(link)) throw new Error('O link precisa começar com https:// ou com / (página do portal).')
    const cohortId = turma === 'todas' ? null : isId(turma) ? turma : undefined
    if (cohortId === undefined) throw new Error('Escolha a turma.')
    if (allowed && (cohortId === null || !allowed.has(cohortId))) throw new Error('A coordenação publica avisos só para a própria turma.')

    const row = {
      cohort_id: cohortId,
      title,
      body,
      signature: str(fd, 'assinatura', 80) || null,
      link_url: link || null,
      link_label: link ? str(fd, 'link_texto', 60) || null : null,
      important: fd.get('importante') === 'on',
      visible_from: from,
      visible_until: until,
    }
    const id = str(fd, 'id', 40)
    if (isId(id)) {
      const { error, count } = await db.from('announcements').update(row, { count: 'exact' }).eq('id', id)
      fail(error)
      if (!count) throw new Error('Sem permissão para editar este aviso.')
      return 'Aviso salvo.'
    }
    const { data, error } = await db.from('announcements').insert({ ...row, status: 'rascunho' }).select('id').single()
    fail(error)
    created.id = data!.id
    created.role = auth.role
  }, 'Aviso salvo.')
  // Novo aviso: abre a página dele (pré-visualização, publicar, histórico).
  if (created.id && created.role && !result?.erro) redirect(`${base(created.role)}/${created.id}?criado=1`)
  return result
}

const TRANSITIONS = { publicar: 'publicado', arquivar: 'arquivado', rascunho: 'rascunho' } as const

export async function setAnnouncementStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async ({ db }) => {
    const id = str(fd, 'id', 40)
    const to = TRANSITIONS[str(fd, 'para', 20) as keyof typeof TRANSITIONS]
    if (!isId(id) || !to) throw new Error('Ação inválida.')
    const { error, count } = await db.from('announcements').update({ status: to }, { count: 'exact' }).eq('id', id)
    fail(error)
    if (!count) throw new Error('Sem permissão para alterar este aviso.')
    return to === 'publicado' ? 'Publicado. Aparece para a turma dentro do período.' : to === 'arquivado' ? 'Arquivado. Saiu da vista dos alunos.' : 'Voltou para rascunho.'
  })
}

export async function deleteAnnouncement(_: ActionState, fd: FormData): Promise<ActionState> {
  const done: { role?: string } = {}
  const result = await run(async ({ auth, db }) => {
    const id = str(fd, 'id', 40)
    if (!isId(id)) throw new Error('Aviso inválido.')
    const { error, count } = await db.from('announcements').delete({ count: 'exact' }).eq('id', id)
    fail(error)
    if (!count) throw new Error('Só rascunho que nunca foi publicado pode ser excluído. Os demais são arquivados.')
    done.role = auth.role
  })
  if (done.role && !result?.erro) redirect(base(done.role))
  return result
}

/** "Entendi" do aluno: esconde um aviso comum. O banco recusa avisos importantes. */
export async function dismissAnnouncement(fd: FormData): Promise<void> {
  const auth = await requireUser()
  const supabase = await createSupabaseServerClient()
  const id = str(fd, 'id', 40)
  if (!auth || !supabase || !isId(id)) return
  await supabase.from('announcement_dismissals').upsert({ user_id: auth.userId, announcement_id: id }, { ignoreDuplicates: true })
  revalidatePath('/')
}
