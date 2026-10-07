'use server'

import { createSupabaseAdminClient } from '@portal/db/admin'
import { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { requireUser } from '@/lib/auth/session'

export type PeopleFormState = { erro?: string; aviso?: string; link?: string } | undefined

const ROLES = ['aluno', 'coordenacao', 'admin'] as const
type InviteRole = (typeof ROLES)[number]

function text(formData: FormData, key: string) {
  const v = formData.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

/** Só admin (requireUser) — e, de novo, a RLS no banco em cada gravação. */
async function adminContext() {
  const auth = await requireUser(['admin'])
  const supabase = await createSupabaseServerClient()
  const service = createSupabaseAdminClient()
  if (!auth || !supabase) return { erro: 'Banco não configurado neste ambiente.' } as const
  if (!service) return { erro: 'A chave secreta do Supabase não está configurada no servidor.' } as const
  return { auth, supabase, service } as const
}

async function returnUrl() {
  const origin = (await headers()).get('origin')
  return origin ? `${origin}/auth/retorno` : undefined
}

async function inviteLink(hashedToken: string) {
  const origin = (await headers()).get('origin') ?? ''
  return `${origin}/auth/confirmar?token_hash=${encodeURIComponent(hashedToken)}&type=invite`
}

function inviteError(error: { status?: number; code?: string; message: string }) {
  if (error.code === 'email_exists' || error.status === 422) return 'Já existe uma conta com este e-mail.'
  if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
    return 'Limite de envio de e-mails atingido no servidor de e-mail provisório. Use "Gerar link para enviar por mensagem".'
  }
  return 'Não foi possível criar o convite. Tente de novo.'
}

export async function invitePerson(_: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  const ctx = await adminContext()
  if ('erro' in ctx) return { erro: ctx.erro }
  const { supabase, service } = ctx

  const email = text(formData, 'email').toLowerCase()
  const fullName = text(formData, 'nome')
  const role = text(formData, 'papel') as InviteRole
  const cohortId = text(formData, 'turma')
  const delivery = text(formData, 'envio') === 'link' ? 'link' : 'email'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: 'Informe um e-mail válido.' }
  if (fullName.length < 3) return { erro: 'Informe o nome completo.' }
  if (!ROLES.includes(role)) return { erro: 'Escolha o papel.' }
  if (role !== 'admin' && !cohortId) return { erro: 'Escolha a turma.' }

  // O Auth reenviaria o convite de quem ainda não entrou; aqui, conta existente é sempre recusada.
  const { data: existing } = await supabase.rpc('admin_people')
  if (existing?.some((p) => p.email.toLowerCase() === email)) {
    return { erro: 'Já existe uma conta com este e-mail. Para um convite pendente, use "Gerar novo link" ou "Reenviar e-mail" na lista.' }
  }

  let userId: string
  let link: string | undefined
  if (delivery === 'email') {
    const { data, error } = await service.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName }, redirectTo: await returnUrl() })
    if (error || !data.user) return { erro: inviteError(error ?? { message: '' }) }
    userId = data.user.id
  } else {
    const { data, error } = await service.auth.admin.generateLink({ type: 'invite', email, options: { data: { full_name: fullName } } })
    if (error || !data.user) return { erro: inviteError(error ?? { message: '' }) }
    userId = data.user.id
    link = await inviteLink(data.properties.hashed_token)
  }

  // Papel e matrícula gravados com a sessão do admin: passam pela RLS e pela proteção de papéis.
  if (role !== 'aluno') {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) return { erro: 'Convite criado, mas o papel não foi gravado. Ajuste na lista.', link }
  }
  if (role !== 'admin') {
    const { error } = await supabase
      .from('enrollments')
      .insert({ user_id: userId, cohort_id: cohortId, role_in_cohort: role === 'coordenacao' ? 'coordenacao' : 'aluno' })
    if (error) return { erro: 'Convite criado, mas a matrícula na turma não foi gravada.', link }
  }

  revalidatePath('/admin/alunos')
  revalidatePath('/admin/equipe')
  return delivery === 'email'
    ? { aviso: `Convite enviado para ${email}. O link vale por 24 horas.` }
    : { aviso: `Convite criado para ${email}. Envie o link abaixo por mensagem; ele vale por 24 horas e só funciona uma vez.`, link }
}

async function accessLink(hashedToken: string, type: 'invite' | 'recovery') {
  const origin = (await headers()).get('origin') ?? ''
  return `${origin}/auth/confirmar?token_hash=${encodeURIComponent(hashedToken)}&type=${type}`
}

type PersonRow = { id: string; email: string; role: 'aluno' | 'coordenacao' | 'admin'; last_sign_in_at: string | null; deactivated_at: string | null }

async function findPerson(ctx: Extract<Awaited<ReturnType<typeof adminContext>>, { auth: unknown }>, id: string): Promise<PersonRow | null> {
  const { data } = await ctx.supabase.rpc('admin_people')
  return (data ?? []).find((p) => p.id === id) ?? null
}

/**
 * Reenviar acesso, conforme o estado da conta:
 * - ainda não entrou → novo convite (o link anterior deixa de valer);
 * - já tem senha → link de "criar nova senha" (recuperação). Nunca cria conta duplicada.
 * "link" devolve o endereço para copiar e mandar por mensagem; "email" usa o envio do Supabase.
 */
export async function resendAccess(_: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  const ctx = await adminContext()
  if ('erro' in ctx) return { erro: ctx.erro }
  const person = await findPerson(ctx, text(formData, 'id'))
  if (!person) return { erro: 'Pessoa não encontrada.' }
  if (person.deactivated_at) return { erro: 'O acesso desta pessoa está desativado. Reative antes de reenviar.' }
  const byEmail = text(formData, 'envio') === 'email'
  const firstAccess = person.last_sign_in_at === null

  if (firstAccess) {
    if (byEmail) {
      const { error } = await ctx.service.auth.admin.inviteUserByEmail(person.email, { redirectTo: await returnUrl() })
      if (!error) return { aviso: `Convite reenviado para ${person.email}.` }
      if (error.status === 429) return { erro: inviteError(error) }
      // Conta já confirmada sem login (ex.: criada com senha): segue para a recuperação abaixo.
    } else {
      const { data, error } = await ctx.service.auth.admin.generateLink({ type: 'invite', email: person.email })
      if (!error && data) {
        return { aviso: 'Novo link de primeiro acesso (vale por 24 horas e só funciona uma vez). O anterior deixou de valer.', link: await accessLink(data.properties.hashed_token, 'invite') }
      }
    }
  }

  if (byEmail) {
    const { error } = await ctx.service.auth.resetPasswordForEmail(person.email, { redirectTo: await returnUrl() })
    if (error?.status === 429) return { erro: inviteError(error) }
    if (error) return { erro: 'Não foi possível enviar o e-mail. Use "Gerar link".' }
    return { aviso: `Enviamos para ${person.email} um link para criar uma nova senha.` }
  }
  const { data, error } = await ctx.service.auth.admin.generateLink({ type: 'recovery', email: person.email })
  if (error || !data) return { erro: 'Não foi possível gerar o link.' }
  return {
    aviso: 'A pessoa já tem conta: este link permite criar uma nova senha (vale por 24 horas e só funciona uma vez).',
    link: await accessLink(data.properties.hashed_token, 'recovery'),
  }
}

/**
 * Excluir pessoa com segurança:
 * - sem nenhum histórico (nunca entrou, sem aceites, sem alterações, sem vínculo de docente) → conta apagada;
 * - com histórico → acesso desativado: não entra mais e perde permissões na hora; perfil e histórico ficam.
 */
export async function removePerson(_: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  const ctx = await adminContext()
  if ('erro' in ctx) return { erro: ctx.erro }
  const person = await findPerson(ctx, text(formData, 'id'))
  if (!person) return { erro: 'Pessoa não encontrada.' }
  if (person.id === ctx.auth.userId) return { erro: 'Você não pode remover a própria conta.' }
  const { data: people } = await ctx.supabase.rpc('admin_people')
  if (person.role === 'admin' && !person.deactivated_at && !(people ?? []).some((p) => p.role === 'admin' && !p.deactivated_at && p.id !== person.id)) {
    return { erro: 'Não é possível remover o último admin.' }
  }

  const { data: footprint, error: fpError } = await ctx.supabase.rpc('admin_person_footprint', { p_user_id: person.id })
  if (fpError || !footprint) return { erro: 'Não foi possível verificar o histórico.' }
  const f = footprint as { entrou: boolean; aceites: number; materiais_marcados: number; alteracoes: number; docente_vinculado: number }
  const hasHistory = f.entrou || f.aceites > 0 || f.materiais_marcados > 0 || f.alteracoes > 0 || f.docente_vinculado > 0

  if (!hasHistory) {
    const { error } = await ctx.service.auth.admin.deleteUser(person.id)
    if (error) return { erro: 'Não foi possível excluir.' }
    revalidatePath('/admin', 'layout')
    return { aviso: `${person.email} foi excluído (não havia histórico).` }
  }

  const { error } = await ctx.supabase.from('profiles').update({ deactivated_at: new Date().toISOString() }).eq('id', person.id)
  if (error) return { erro: error.message.includes('último admin') ? 'Não é possível remover o último admin.' : 'Não foi possível desativar.' }
  // Bloqueia também no Auth: não entra mais nem renova sessões abertas.
  await ctx.service.auth.admin.updateUserById(person.id, { ban_duration: '876000h' })
  revalidatePath('/admin', 'layout')
  return { aviso: 'A pessoa tinha histórico: o acesso foi desativado e o histórico foi preservado. Dá para reativar quando quiser.' }
}

export async function reactivatePerson(_: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  const ctx = await adminContext()
  if ('erro' in ctx) return { erro: ctx.erro }
  const person = await findPerson(ctx, text(formData, 'id'))
  if (!person) return { erro: 'Pessoa não encontrada.' }
  const { error } = await ctx.supabase.from('profiles').update({ deactivated_at: null }).eq('id', person.id)
  if (error) return { erro: 'Não foi possível reativar.' }
  await ctx.service.auth.admin.updateUserById(person.id, { ban_duration: 'none' })
  revalidatePath('/admin', 'layout')
  return { aviso: 'Acesso reativado. A pessoa volta a entrar com a mesma senha.' }
}
