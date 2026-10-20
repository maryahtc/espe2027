import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { type AuthState, requireUser } from '@/lib/auth/session'
import { getSimulation, type Simulation } from './session'

type Db = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

/** Gravação bloqueada na simulação — se aparecer, alguma ação esqueceu de desviar para o rascunho. */
export class SimulationWriteBlocked extends Error {
  constructor(what: string) {
    super(`Simulação: gravação bloqueada (${what}). Nada foi salvo.`)
  }
}

const WRITE_METHODS = new Set(['insert', 'update', 'upsert', 'delete'])
/** Funções do banco que só leem (as demais são recusadas na simulação). */
const READ_RPC = new Set(['can_register_cases', 'current_terms_version_id', 'needs_terms_acceptance', 'search_library', 'suggest_topics', 'module_for_date'])

/**
 * Conexão "só leitura" (defesa extra): na simulação, qualquer insert/update/upsert/delete, função que grava
 * ou operação no Storage dá erro em vez de gravar.
 */
export function readOnly(db: Db): Db {
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (table: string) => {
          const query = target.from(table as never) as unknown as Record<string, unknown>
          return new Proxy(query, {
            get(q, p) {
              if (typeof p === 'string' && WRITE_METHODS.has(p)) return () => { throw new SimulationWriteBlocked(`${p} em ${table}`) }
              const v = q[p as string]
              return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(q) : v
            },
          })
        }
      }
      if (prop === 'rpc') {
        return (fn: string, ...args: unknown[]) => {
          if (!READ_RPC.has(fn)) throw new SimulationWriteBlocked(`função ${fn}`)
          return (target.rpc as (...a: unknown[]) => unknown)(fn, ...args)
        }
      }
      if (prop === 'storage') {
        return { from: () => new Proxy({}, { get: (_, p) => () => { throw new SimulationWriteBlocked(`Storage (${String(p)})`) } }) }
      }
      const v = Reflect.get(target, prop, receiver)
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(target) : v
    },
  }) as Db
}

export const ADMIN_BLOCKED = 'Conta administrativa: para percorrer o portal como aluno, use o Modo de simulação (Admin → Ver portal como aluno). Nada foi salvo.'
export const STAFF_BLOCKED = 'Esta ação é do aluno. Contas da coordenação só consultam o portal do aluno.'

export type StudentGate =
  | { kind: 'real'; auth: AuthState; db: Db }
  | { kind: 'sim'; auth: AuthState; db: Db; sim: Simulation }
  | { kind: 'blocked'; reason: string }

/**
 * Antes de qualquer ação do aluno que grava:
 * - aluno de verdade → banco (com a RLS de sempre);
 * - Admin em simulação → rascunho temporário (conexão só leitura);
 * - Admin fora da simulação ou coordenação → bloqueado (nunca gera progresso, checklist, avisos ou casos).
 */
export async function studentGate(): Promise<StudentGate> {
  const auth = await requireUser()
  const db = await createSupabaseServerClient()
  if (!auth || !db) return { kind: 'blocked', reason: 'Banco não configurado neste ambiente.' }
  const sim = await getSimulation()
  if (sim) return { kind: 'sim', auth, db: readOnly(db), sim }
  if (auth.role === 'aluno') return { kind: 'real', auth, db }
  return { kind: 'blocked', reason: auth.role === 'admin' ? ADMIN_BLOCKED : STAFF_BLOCKED }
}
