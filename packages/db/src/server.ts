import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'
import { readSupabaseEnv } from './env'

/**
 * Cliente do Supabase para Server Components, Server Actions e Route Handlers.
 * Usa a sessão do usuário (cookies) → toda leitura passa pela RLS.
 * Devolve null enquanto o projeto não estiver configurado (Etapa 1).
 */
export async function createSupabaseServerClient() {
  const env = readSupabaseEnv()
  if (!env) return null
  const cookieStore = await cookies()
  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options)
        } catch {
          // Chamado a partir de um Server Component: a renovação da sessão é feita no proxy.
        }
      },
    },
  })
}
