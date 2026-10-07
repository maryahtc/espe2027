'use server'

import { createSupabaseServerClient } from '@portal/db/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { loadAuth, nextStep, requireSignedIn } from './session'

export type FormState = { erro?: string; aviso?: string; email?: string } | undefined

const PASSWORD_RULE = 'Use pelo menos 10 caracteres, com letras e números.'

function text(formData: FormData, key: string) {
  const v = formData.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

function validPassword(p: string) {
  return p.length >= 10 && /[a-zA-Z]/.test(p) && /\d/.test(p)
}

async function client() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) throw new Error('Supabase não configurado.')
  return supabase
}

/** Depois de um passo concluído, lê a sessão atualizada e segue para o próximo (2FA → termo → destino). */
async function continueTo(next: unknown): Promise<never> {
  const auth = await loadAuth()
  if (!auth || auth === 'previa') redirect('/entrar')
  redirect(nextStep(auth, next))
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, 'email').toLowerCase()
  const password = typeof formData.get('senha') === 'string' ? (formData.get('senha') as string) : ''
  if (!email || !password) return { erro: 'Informe e-mail e senha.', email }
  const supabase = await client()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.status === 429) return { erro: 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.' }
    // Erro que não é credencial errada (ex.: configuração do Auth) fica no log do servidor, sem dados pessoais.
    if (error.code !== 'invalid_credentials') console.error('[entrar]', error.status, error.code)
    // Mensagem única: não revela se o e-mail existe.
    return { erro: 'E-mail ou senha incorretos.', email }
  }
  return continueTo(formData.get('next'))
}

export async function signOut(): Promise<never> {
  const supabase = await createSupabaseServerClient()
  await supabase?.auth.signOut({ scope: 'local' })
  redirect('/entrar?saiu=1')
}

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, 'email').toLowerCase()
  if (!email.includes('@')) return { erro: 'Informe um e-mail válido.', email }
  const supabase = await client()
  const origin = (await headers()).get('origin')
  const { error } = await supabase.auth.resetPasswordForEmail(email, origin ? { redirectTo: `${origin}/auth/retorno` } : undefined)
  if (error?.status === 429) return { erro: 'Muitos pedidos seguidos. Aguarde alguns minutos e tente de novo.' }
  // Mesma resposta exista ou não a conta.
  return { aviso: 'Se houver uma conta com este e-mail, enviamos um link para criar uma nova senha. Confira também o spam.' }
}

/**
 * Link do e-mail (convite ou recuperação). A confirmação exige um clique na página — assim, leitores de
 * e-mail que abrem links automaticamente não consomem o link de uso único.
 */
export async function confirmEmailLink(_: FormState, formData: FormData): Promise<FormState> {
  const tokenHash = text(formData, 'token_hash')
  const type = text(formData, 'type')
  if (!tokenHash || (type !== 'invite' && type !== 'recovery')) return { erro: 'Link inválido.' }
  const supabase = await client()
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  if (error) return { erro: 'Este link expirou ou já foi usado. Peça um novo.' }
  redirect(type === 'invite' ? '/definir-senha?motivo=convite' : '/definir-senha?motivo=recuperacao')
}

/**
 * Links no formato padrão do Supabase (plano gratuito sem SMTP próprio): a sessão chega no fragmento do
 * endereço (#access_token=…), que só o navegador lê. A tela /auth/retorno entrega os tokens aqui, e o
 * servidor valida com o Auth antes de gravar os cookies.
 */
export async function establishSessionFromLink(_: FormState, formData: FormData): Promise<FormState> {
  const accessToken = text(formData, 'access_token')
  const refreshToken = text(formData, 'refresh_token')
  const type = text(formData, 'type')
  if (!accessToken || !refreshToken) return { erro: 'Link inválido.' }
  const supabase = await client()
  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  if (error) return { erro: 'Este link expirou ou já foi usado. Peça um novo.' }
  if (type === 'invite') redirect('/definir-senha?motivo=convite')
  if (type === 'recovery') redirect('/definir-senha?motivo=recuperacao')
  return continueTo(null)
}

export async function setPassword(_: FormState, formData: FormData): Promise<FormState> {
  const auth = await requireSignedIn()
  if (auth.hasVerifiedFactor && auth.aal !== 'aal2') redirect('/seguranca/2fa?next=/definir-senha')
  const password = typeof formData.get('senha') === 'string' ? (formData.get('senha') as string) : ''
  const confirm = typeof formData.get('confirmacao') === 'string' ? (formData.get('confirmacao') as string) : ''
  if (!validPassword(password)) return { erro: PASSWORD_RULE }
  if (password !== confirm) return { erro: 'As duas senhas não são iguais.' }
  const supabase = await client()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    if (error.code === 'same_password') return { erro: 'A nova senha precisa ser diferente da atual.' }
    if (error.code === 'weak_password') return { erro: `Senha fraca. ${PASSWORD_RULE}` }
    return { erro: 'Não foi possível salvar a senha. Tente de novo.' }
  }
  return continueTo(formData.get('next'))
}

async function firstVerifiedTotp() {
  const supabase = await client()
  const { data } = await supabase.auth.mfa.listFactors()
  return data?.all.find((f) => f.factor_type === 'totp' && f.status === 'verified') ?? null
}

/** Entrada com 2FA: confere o código de 6 dígitos do aplicativo autenticador. */
export async function verifyMfa(_: FormState, formData: FormData): Promise<FormState> {
  await requireSignedIn()
  const code = text(formData, 'codigo').replace(/\s/g, '')
  if (!/^\d{6}$/.test(code)) return { erro: 'Digite os 6 números que aparecem no aplicativo.' }
  const factor = await firstVerifiedTotp()
  if (!factor) redirect('/seguranca/2fa/configurar')
  const supabase = await client()
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
  if (error) {
    if (error.status === 429) return { erro: 'Muitas tentativas seguidas. Aguarde alguns minutos.' }
    return { erro: 'Código incorreto ou expirado. Confira o horário do celular e tente o código atual.' }
  }
  return continueTo(formData.get('next'))
}

/** Cadastro do 2FA: confirma o primeiro código do aplicativo, o que também eleva a sessão para aal2. */
export async function confirmMfaEnrollment(_: FormState, formData: FormData): Promise<FormState> {
  await requireSignedIn()
  const factorId = text(formData, 'factor_id')
  const code = text(formData, 'codigo').replace(/\s/g, '')
  if (!/^\d{6}$/.test(code)) return { erro: 'Digite os 6 números que aparecem no aplicativo.' }
  const supabase = await client()
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) return { erro: 'Código incorreto ou expirado. Confira o horário do celular e tente o código atual.' }
  return continueTo(formData.get('next'))
}

export async function acceptTerms(_: FormState, formData: FormData): Promise<FormState> {
  const auth = await requireSignedIn()
  if (formData.get('aceito') !== 'sim') return { erro: 'Para continuar, marque que leu e aceita o termo.' }
  const supabase = await client()
  const { error } = await supabase
    .from('terms_acceptances')
    .insert({ user_id: auth.userId, terms_version_id: text(formData, 'versao') })
  // 23505 = já aceito (ex.: clique duplo) → segue normalmente.
  if (error && error.code !== '23505') {
    return { erro: 'O termo foi atualizado enquanto você lia. Recarregue a página para ver a versão vigente.' }
  }
  return continueTo(formData.get('next'))
}
