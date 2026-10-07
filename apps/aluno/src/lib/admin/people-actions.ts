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

/** Só admin com 2FA (requireUser) — e, de novo, a RLS no banco em cada gravação. */
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

/** Convite pendente: novo link (o anterior deixa de valer) ou novo e-mail. */
export async function renewInvite(_: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  const ctx = await adminContext()
  if ('erro' in ctx) return { erro: ctx.erro }
  const email = text(formData, 'email').toLowerCase()
  if (text(formData, 'envio') === 'email') {
    const { error } = await ctx.service.auth.admin.inviteUserByEmail(email, { redirectTo: await returnUrl() })
    if (error) return { erro: error.status === 429 ? inviteError(error) : 'Não foi possível reenviar. Se a pessoa já criou a senha, ela deve usar "Esqueci minha senha".' }
    return { aviso: `Convite reenviado para ${email}.` }
  }
  const { data, error } = await ctx.service.auth.admin.generateLink({ type: 'invite', email })
  if (error) return { erro: 'Não foi possível gerar o link. Se a pessoa já criou a senha, ela deve usar "Esqueci minha senha".' }
  return { aviso: 'Novo link gerado (vale por 24 horas, uso único).', link: await inviteLink(data.properties.hashed_token) }
}

/** Celular perdido: apaga o 2FA de outra pessoa; ela configura de novo na próxima entrada. */
export async function resetPersonMfa(_: PeopleFormState, formData: FormData): Promise<PeopleFormState> {
  const ctx = await adminContext()
  if ('erro' in ctx) return { erro: ctx.erro }
  const { error } = await ctx.supabase.rpc('admin_reset_mfa', { p_user_id: text(formData, 'id') })
  if (error) return { erro: 'Não foi possível redefinir o 2FA.' }
  revalidatePath('/admin/alunos')
  revalidatePath('/admin/equipe')
  return { aviso: '2FA redefinido. A pessoa vai configurar de novo na próxima entrada.' }
}
