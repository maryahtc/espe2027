import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import { type AuthState, nextStep, type Role } from './flow'

export type { AuthState, Role } from './flow'
export { homeFor, nextStep, safeNext } from './flow'

/**
 * Estado da sessão atual.
 * - `null`: ninguém logado.
 * - `'previa'`: Supabase não configurado (desenvolvimento sem banco) → portal só com dados fictícios.
 * A identidade vem do token verificado (getClaims); papel e termo vêm do banco, sujeitos à RLS.
 */
export async function loadAuth(): Promise<AuthState | null | 'previa'> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return 'previa'
  const { data } = await supabase.auth.getClaims()
  if (!data) return null
  const { claims } = data

  const [{ data: profile }, { data: needsTerms }] = await Promise.all([
    supabase.from('profiles').select('role, full_name, display_name').eq('id', claims.sub).maybeSingle(),
    supabase.rpc('needs_terms_acceptance'),
  ])
  if (!profile) return null

  return {
    userId: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : '',
    role: profile.role,
    fullName: profile.full_name,
    displayName: profile.display_name,
    needsTerms: needsTerms === true,
  }
}

/** loadAuth memorizado por requisição. Depois de mudar a sessão (login, aceite), use loadAuth direto. */
export const getAuth = cache(loadAuth)

/**
 * Exige sessão completa (termo em dia) e, opcionalmente, um dos papéis.
 * Papel errado → 404 (não revela que a área existe). Devolve null no modo prévia (sem Supabase).
 * É conveniência de navegação: a garantia real é a RLS no banco.
 */
export async function requireUser(roles?: Role[]): Promise<AuthState | null> {
  const auth = await getAuth()
  if (auth === 'previa') return null
  if (!auth) redirect('/entrar')
  const step = nextStep(auth)
  if (step.startsWith('/termo')) redirect(step)
  if (roles && !roles.includes(auth.role)) notFound()
  return auth
}

/** Para as telas da própria entrada (definir senha, termo): só exige estar logado. */
export async function requireSignedIn(): Promise<AuthState> {
  const auth = await getAuth()
  if (auth === 'previa' || !auth) redirect('/entrar')
  return auth
}
