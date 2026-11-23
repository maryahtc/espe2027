'use server'

import { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import type { ActionState } from '@/lib/admin/academic-actions'
import { requireUser } from '@/lib/auth/session'
import { tasksReady } from '@/lib/tasks/schema'

/** Cadastro da Equipe operacional: só o Admin (a garantia é a RLS). Sem exclusão: desativar. */
const str = (fd: FormData, k: string, max: number) => {
  const v = fd.get(k)
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

export async function saveOpsPerson(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const auth = await requireUser(['admin'])
    const db = await createSupabaseServerClient()
    if (!auth || !db) throw new Error('Banco não configurado neste ambiente.')
    if (!(await tasksReady())) throw new Error('A Equipe operacional ainda não está disponível neste banco.')
    const id = str(fd, 'id', 40)
    const name = str(fd, 'nome', 120)
    if (!name) throw new Error('Escreva o nome.')
    const email = str(fd, 'email', 200)
    if (email && !/^[^@\s]+@[^@\s]+$/.test(email)) throw new Error('E-mail inválido.')
    const person = { name, role_title: str(fd, 'funcao', 120) || null, active: fd.get('ativo') === 'on' || !id }
    let personId = id
    if (id) {
      if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Cadastro inválido.')
      const { error } = await db.from('ops_people').update(person).eq('id', id)
      if (error) throw new Error('Não foi possível salvar.')
    } else {
      const { data, error } = await db.from('ops_people').insert(person).select('id').single()
      if (error || !data) throw new Error('Não foi possível cadastrar.')
      personId = data.id
    }
    const contact = { person_id: personId, email: email || null, phone: str(fd, 'telefone', 40) || null, notes: str(fd, 'obs', 500) || null }
    const { error: cErr } = await db.from('ops_people_contacts').upsert(contact, { onConflict: 'person_id' })
    if (cErr) throw new Error('Pessoa salva, mas o contato não foi gravado.')
    revalidatePath('/admin/equipe-operacional')
    revalidatePath('/admin/pendencias')
    return { aviso: id ? 'Cadastro atualizado.' : 'Pessoa cadastrada.' }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
    return { erro: e instanceof Error ? e.message : 'Não foi possível salvar.' }
  }
}
