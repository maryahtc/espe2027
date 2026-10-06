/**
 * Configuração do Supabase. As duas variáveis NEXT_PUBLIC_ são públicas por natureza
 * (URL do projeto e chave publicável, protegida pela RLS). A chave secreta (service role)
 * NUNCA usa o prefixo NEXT_PUBLIC_ e só é lida em código de servidor (a partir da Etapa 2).
 */
export type SupabaseEnv = { url: string; publishableKey: string }

export function readSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) return null
  return { url, publishableKey }
}
