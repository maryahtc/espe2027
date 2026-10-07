'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import { COHORT_COOKIE, viewerCohorts } from './load'

/** Admin e coordenação: escolher qual turma ver na área do aluno. */
export async function chooseCohort(formData: FormData) {
  const id = String(formData.get('turma') ?? '')
  const allowed = await viewerCohorts()
  if (allowed.some((c) => c.id === id)) {
    ;(await cookies()).set(COHORT_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 180 })
  }
  const back = String(formData.get('voltar') ?? '/cronograma')
  redirect(back.startsWith('/') && !back.startsWith('//') ? back : '/cronograma')
}

/** Aluno marca/desmarca um item da lista de materiais (só a própria lista; RLS confere o módulo). */
export async function toggleMaterial(materialId: string, checked: boolean): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  if (!supabase || !/^[0-9a-f-]{36}$/.test(materialId)) return false
  const { error } = checked
    ? await supabase.from('material_checks').upsert({ material_id: materialId }, { onConflict: 'user_id,material_id', ignoreDuplicates: true })
    : await supabase.from('material_checks').delete().eq('material_id', materialId)
  if (!error) revalidatePath('/', 'layout')
  return !error
}
