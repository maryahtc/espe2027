'use server'

import { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import type { ActionState } from './actions'

/**
 * Exclusão física definitiva — ação administrativa excepcional:
 * só admin, só caso já excluído pelo aluno, com motivo e com a confirmação do código do paciente.
 * Os arquivos da capa são apagados antes (a regra do bucket só permite isso para caso removido) e então purge_case
 * apaga caso, registros e temas e grava a auditoria (quem, quando, motivo, contagens — sem conteúdo clínico).
 */
export async function purgeCase(_: ActionState, fd: FormData): Promise<ActionState> {
  const done: { ok?: boolean } = {}
  try {
    const auth = await requireUser(['admin'])
    const db = await createSupabaseServerClient()
    if (!auth || !db) throw new Error('Banco não configurado neste ambiente.')
    const caseId = String(fd.get('id') ?? '')
    const reason = String(fd.get('motivo') ?? '').trim().slice(0, 300)
    const typed = String(fd.get('codigo') ?? '').trim().toUpperCase()
    if (!/^[0-9a-f-]{36}$/.test(caseId)) throw new Error('Caso inválido.')
    if (reason.length < 5) throw new Error('Informe o motivo (pelo menos 5 caracteres).')
    const { data: c } = await db.from('clinical_cases').select('id, owner_id, patient_label, removed_at').eq('id', caseId).maybeSingle()
    if (!c) throw new Error('Caso não encontrado.')
    if (!c.removed_at) throw new Error('Só um caso já excluído pelo aluno pode ser excluído definitivamente.')
    if (typed !== c.patient_label) throw new Error('Para confirmar, digite exatamente o código do paciente.')
    const bucket = db.storage.from('case-covers')
    const { data: files } = await bucket.list(`${c.owner_id}/${c.id}`)
    if (files?.length) {
      const { error } = await bucket.remove(files.map((f) => `${c.owner_id}/${c.id}/${f.name}`))
      if (error) throw new Error('Não foi possível apagar a foto de capa; nada foi excluído.')
    }
    const { error } = await db.rpc('purge_case', { p_case_id: caseId, p_reason: reason })
    if (error) throw new Error(error.code === '42501' ? 'Apenas admin.' : 'Não foi possível excluir definitivamente.')
    revalidatePath('/admin/casos', 'layout')
    done.ok = true
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
    return { erro: e instanceof Error ? e.message : 'Não foi possível excluir.' }
  }
  if (done.ok) redirect('/admin/casos?excluido=1')
  return undefined
}
