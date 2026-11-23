import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { tasksReady } from '@/lib/tasks/schema'

/**
 * Equipe operacional (compras, recepção…), independente de docentes e coordenação. Nome: Admin e coordenação ativa.
 * Contatos: só o Admin (tabela separada, RLS). Nenhuma tela acadêmica, da Biblioteca ou do site público lê daqui.
 */
export type OpsPerson = { id: string; name: string; roleTitle: string | null; active: boolean; contact: { email: string | null; phone: string | null; notes: string | null } | null }

export async function loadOpsPeople(withContacts: boolean): Promise<OpsPerson[] | null> {
  if (!(await tasksReady())) return null
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null
  const [{ data: people }, { data: contacts }] = await Promise.all([
    supabase.from('ops_people').select('id, name, role_title, active').order('name'),
    withContacts ? supabase.from('ops_people_contacts').select('person_id, email, phone, notes') : Promise.resolve({ data: [] as Array<{ person_id: string; email: string | null; phone: string | null; notes: string | null }> }),
  ])
  const byPerson = new Map((contacts ?? []).map((c) => [c.person_id, { email: c.email, phone: c.phone, notes: c.notes }]))
  return (people ?? []).map((p) => ({ id: p.id, name: p.name, roleTitle: p.role_title, active: p.active, contact: byPerson.get(p.id) ?? null }))
}
