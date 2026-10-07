import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import type { Database } from '@portal/db/types'

export type Person = Database['public']['Functions']['admin_people']['Returns'][number]
export type CohortOption = { id: string; name: string }

/** Pessoas e turmas para o painel (a função do banco recusa quem não é admin). */
export async function loadPeople(): Promise<{ people: Person[]; cohorts: CohortOption[] }> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { people: [], cohorts: [] }
  const [{ data: people }, { data: cohorts }] = await Promise.all([
    supabase.rpc('admin_people'),
    supabase.from('cohorts').select('id, name').order('starts_on'),
  ])
  return { people: people ?? [], cohorts: cohorts ?? [] }
}

export function isPending(p: Person) {
  return p.invited_at !== null && p.last_sign_in_at === null
}
