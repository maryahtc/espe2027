'use server'

import { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import type { ActionState } from '@/lib/admin/academic-actions'
import { requireUser } from '@/lib/auth/session'
import { LODGING, type Lodging, PARTICIPATION, type Participation, TRAVEL, type Travel } from './model'
import { logisticsReady } from './schema'

/**
 * Ações de professores e logística: só o Admin edita (a coordenação consulta). A garantia é a RLS; aqui as mensagens
 * ficam claras. Nunca toca na programação acadêmica.
 */
type Db = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

async function admin(): Promise<Db> {
  const auth = await requireUser(['admin'])
  const db = await createSupabaseServerClient()
  if (!auth || !db) throw new Error('Só o Admin edita professores e logística.')
  if (!(await logisticsReady())) throw new Error('Professores e logística ainda não estão disponíveis neste banco.')
  return db as Db
}

async function run(fn: (db: Db) => Promise<string>): Promise<ActionState> {
  try {
    const msg = await fn(await admin())
    revalidatePath('/admin/professores', 'layout')
    revalidatePath('/coordenacao/professores')
    revalidatePath('/admin')
    return { aviso: msg }
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e) throw e
    return { erro: e instanceof Error ? e.message : 'Não foi possível salvar.' }
  }
}

const str = (fd: FormData, k: string, max: number) => {
  const v = fd.get(k)
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
const opt = (fd: FormData, k: string, max: number) => str(fd, k, max) || null
const isId = (v: string) => /^[0-9a-f-]{36}$/.test(v)
const date = (fd: FormData, k: string) => {
  const v = str(fd, k, 10)
  if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('Data inválida.')
  return v || null
}
const dateTime = (fd: FormData, k: string) => {
  const v = str(fd, k, 16)
  if (v && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) throw new Error('Data e hora inválidas.')
  return v || null
}
const link = (fd: FormData, k: string) => {
  const v = str(fd, k, 500)
  if (v && !/^https:\/\//i.test(v)) throw new Error('O link do comprovante precisa começar com https://')
  return v || null
}
const oneOf = <T extends string>(v: string, all: readonly T[], fallback: T): T => ((all as readonly string[]).includes(v) ? (v as T) : fallback)
/** Responsável: "f:<id>" (equipe acadêmica) ou "o:<id>" (Equipe operacional). */
function responsible(fd: FormData, k: string): { f: string | null; o: string | null } {
  const v = str(fd, k, 40)
  const id = v.slice(2)
  if (!isId(id)) return { f: null, o: null }
  return v.startsWith('f:') ? { f: id, o: null } : v.startsWith('o:') ? { f: null, o: id } : { f: null, o: null }
}

function fail(error: { code?: string; message: string } | null) {
  if (!error) return
  if (error.code === '42501') throw new Error('Só o Admin edita professores e logística.')
  if (error.code === '23514') throw new Error('Confira as datas (saída depois da chegada; check-out depois do check-in) e os links (https://).')
  throw new Error('Não foi possível salvar.')
}

/** Cria ou atualiza a participação e a logística de um professor num módulo. */
export async function saveLogistics(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const moduleId = str(fd, 'modulo', 40)
    const facultyId = str(fd, 'professor', 40)
    if (!isId(moduleId) || !isId(facultyId)) throw new Error('Professor ou módulo inválido.')
    const tr = responsible(fd, 'passagem_responsavel')
    const lr = responsible(fd, 'hospedagem_responsavel')
    const row = {
      module_id: moduleId,
      faculty_id: facultyId,
      participation: oneOf<Participation>(str(fd, 'participacao', 20), PARTICIPATION, 'a_convidar'),
      invited_on: date(fd, 'convidado_em'),
      answered_on: date(fd, 'respondeu_em'),
      travel: oneOf<Travel>(str(fd, 'passagem', 30), TRAVEL, 'a_providenciar'),
      travel_arrival: dateTime(fd, 'chegada'),
      travel_departure: dateTime(fd, 'saida'),
      travel_locator: opt(fd, 'localizador', 100),
      travel_receipt_url: link(fd, 'passagem_comprovante'),
      travel_responsible_id: tr.f,
      travel_responsible_ops_id: tr.o,
      travel_waiting_on: opt(fd, 'passagem_aguardando', 200),
      travel_notes: opt(fd, 'passagem_obs', 1000),
      lodging: oneOf<Lodging>(str(fd, 'hospedagem', 30), LODGING, 'a_reservar'),
      lodging_name: opt(fd, 'hotel', 200),
      check_in: date(fd, 'check_in'),
      check_out: date(fd, 'check_out'),
      lodging_locator: opt(fd, 'reserva', 100),
      lodging_receipt_url: link(fd, 'hospedagem_comprovante'),
      lodging_responsible_id: lr.f,
      lodging_responsible_ops_id: lr.o,
      lodging_waiting_on: opt(fd, 'hospedagem_aguardando', 200),
      lodging_notes: opt(fd, 'hospedagem_obs', 1000),
      notes: opt(fd, 'obs', 1000),
    }
    const { error } = await db.from('module_faculty_logistics').upsert(row, { onConflict: 'module_id,faculty_id' })
    fail(error)
    return 'Logística salva.'
  })
}

/** Contato do professor (só o Admin; a coordenação da turma consulta). */
export async function saveFacultyContact(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (db) => {
    const facultyId = str(fd, 'professor', 40)
    if (!isId(facultyId)) throw new Error('Professor inválido.')
    const email = str(fd, 'email', 200)
    if (email && !/^[^@\s]+@[^@\s]+$/.test(email)) throw new Error('E-mail inválido.')
    const { error } = await db
      .from('faculty_contacts')
      .upsert({ faculty_id: facultyId, email: email || null, phone: opt(fd, 'telefone', 40), city: opt(fd, 'cidade', 120), notes: opt(fd, 'obs', 1000) }, { onConflict: 'faculty_id' })
    fail(error)
    return 'Contato salvo.'
  })
}
