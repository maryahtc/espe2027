import 'server-only'
import type { createSupabaseServerClient } from '@portal/db/server'

type Db = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

/** Abriu o conteúdo (arquivo ou link): registra "em andamento" sem rebaixar quem já concluiu. */
export async function markStarted(supabase: Db, contentId: string): Promise<void> {
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims.sub
  if (!userId) return
  await supabase
    .from('content_progress')
    .upsert({ user_id: userId, content_id: contentId, status: 'iniciado' }, { onConflict: 'user_id,content_id', ignoreDuplicates: true })
}
