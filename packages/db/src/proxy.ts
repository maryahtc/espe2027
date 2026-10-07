import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { sessionCookieOptions } from './cookies'
import type { Database } from './database.types'
import { readSupabaseEnv } from './env'

export type ProxySession = { response: NextResponse; userId: string | null; configured: boolean }

/**
 * Renova a sessão a cada requisição (proxy do Next) e informa se há usuário logado.
 * Só confere a assinatura do token; papéis, 2FA e termo são verificados no servidor, em cada área.
 */
export async function refreshSession(request: NextRequest): Promise<ProxySession> {
  let response = NextResponse.next({ request })
  const env = readSupabaseEnv()
  if (!env) return { response, userId: null, configured: false }

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        for (const { name, value } of toSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options)
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value)
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  return { response, userId: data?.claims.sub ?? null, configured: true }
}
