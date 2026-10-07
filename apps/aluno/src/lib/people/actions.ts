'use server'

import { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/session'

export type NameState = { erro?: string; aviso?: string } | undefined

function clean(v: FormDataEntryValue | null, max = 120) {
  return typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : ''
}

/** A própria pessoa corrige nome completo e nome de exibição (o papel continua protegido no banco). */
export async function updateMyName(_: NameState, formData: FormData): Promise<NameState> {
  const auth = await requireUser()
  const supabase = await createSupabaseServerClient()
  if (!auth || !supabase) return { erro: 'Banco não configurado neste ambiente.' }
  const fullName = clean(formData.get('nome'))
  const displayName = clean(formData.get('exibicao'), 60)
  if (fullName.length < 3) return { erro: 'Informe o nome completo.' }
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, display_name: displayName || null })
    .eq('id', auth.userId)
  if (error) return { erro: 'Não foi possível salvar. Tente de novo.' }
  revalidatePath('/', 'layout')
  return { aviso: 'Nome atualizado.' }
}
