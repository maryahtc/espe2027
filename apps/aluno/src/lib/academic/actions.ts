'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSimulation, updateSimulation } from '@/lib/simulation/session'
import { studentGate } from '@/lib/simulation/gate'
import { simToggleCheck } from '@/lib/simulation/state'
import { COHORT_COOKIE, viewerCohorts } from './load'

/** Admin e coordenação: escolher qual turma ver na área do aluno. */
export async function chooseCohort(formData: FormData) {
  const id = String(formData.get('turma') ?? '')
  const allowed = (await getSimulation()) ? [] : await viewerCohorts() // na simulação, a turma é fixa
  if (allowed.some((c) => c.id === id)) {
    ;(await cookies()).set(COHORT_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 180 })
  }
  const back = String(formData.get('voltar') ?? '/cronograma')
  redirect(back.startsWith('/') && !back.startsWith('//') ? back : '/cronograma')
}

/** Aluno marca/desmarca um item da lista de materiais (só a própria lista; RLS confere o módulo). */
export async function toggleMaterial(materialId: string, checked: boolean): Promise<boolean> {
  const gate = await studentGate()
  if (gate.kind === 'blocked' || !/^[0-9a-f-]{36}$/.test(materialId)) return false
  if (gate.kind === 'sim') {
    // Simulação: o checklist fica só no rascunho.
    try {
      await updateSimulation(gate.sim, (st) => simToggleCheck(st, materialId, checked))
    } catch {
      return false
    }
    revalidatePath('/', 'layout')
    return true
  }
  const supabase = gate.db
  const { error } = checked
    ? await supabase.from('material_checks').upsert({ material_id: materialId }, { onConflict: 'user_id,material_id', ignoreDuplicates: true })
    : await supabase.from('material_checks').delete().eq('material_id', materialId)
  if (!error) revalidatePath('/', 'layout')
  return !error
}
