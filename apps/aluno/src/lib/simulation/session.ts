import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { CohortVM } from '@/lib/academic/model'
import { getAuth } from '@/lib/auth/session'
import { seal, unseal } from './seal'
import { SIM_LIMIT_MSG, SimError, type SimPayload, type SimState } from './state'

/**
 * Sessão da simulação: o rascunho lacrado em cookie(s) httpOnly. Vale só para o Admin que a iniciou, só até
 * expirar (2 h) e só para a turma escolhida. Qualquer divergência → como se não houvesse simulação.
 */
export const SIM_COOKIE = 'portal_simulacao'
const CHUNK = 3800
const MAX_CHUNKS = 2

export type Simulation = SimPayload & { cohortVM: CohortVM }
export type SimulationStatus = 'nenhuma' | 'ativa' | 'expirada' | 'invalida'

async function readRaw(): Promise<string | null> {
  const jar = await cookies()
  const parts: string[] = []
  for (let i = 0; i < MAX_CHUNKS; i++) {
    const v = jar.get(`${SIM_COOKIE}.${i}`)?.value
    if (!v) break
    parts.push(v)
  }
  return parts.length ? parts.join('') : null
}

/** Conta e turma conferidas uma vez por requisição (o cookie em si é relido a cada chamada: muda nas ações). */
const owner = cache(async (admin: string, cohortId: string): Promise<CohortVM | null> => {
  const auth = await getAuth()
  // Só a própria conta Admin que iniciou: cookie copiado para outra conta não vale nada.
  if (!auth || auth === 'previa' || auth.role !== 'admin' || auth.userId !== admin) return null
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null
  const { data: c } = await supabase
    .from('cohorts')
    .select('id, name, slug, starts_on, ends_on, status, description, closed_at')
    .eq('id', cohortId)
    .maybeSingle()
  if (!c) return null
  return { id: c.id, name: c.name, slug: c.slug, startsOn: c.starts_on, endsOn: c.ends_on, status: c.status, description: c.description, closedAt: c.closed_at }
})

async function inspect(): Promise<{ status: SimulationStatus; sim: Simulation | null }> {
  const raw = await readRaw()
  if (!raw) return { status: 'nenhuma', sim: null }
  const p = unseal(raw)
  if (!p) return { status: 'invalida', sim: null }
  if (p.expiresAt <= Date.now()) return { status: 'expirada', sim: null }
  const cohortVM = await owner(p.admin, p.cohort)
  if (!cohortVM) return { status: 'invalida', sim: null }
  return { status: 'ativa', sim: { ...p, cohortVM } }
}

/** Simulação ativa e válida desta requisição (ou null). */
export async function getSimulation(): Promise<Simulation | null> {
  return (await inspect()).sim
}

export async function simulationStatus(): Promise<SimulationStatus> {
  return (await inspect()).status
}

/** Grava o rascunho (só em ações do servidor). Recusa se passar do limite de tamanho. */
export async function writeSimulation(p: SimPayload): Promise<void> {
  const sealed = seal(p)
  if (sealed.length > CHUNK * MAX_CHUNKS) throw new SimError(SIM_LIMIT_MSG)
  const jar = await cookies()
  const maxAge = Math.max(1, Math.floor((p.expiresAt - Date.now()) / 1000))
  const opts = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge }
  for (let i = 0; i < MAX_CHUNKS; i++) {
    const part = sealed.slice(i * CHUNK, (i + 1) * CHUNK)
    if (part) jar.set(`${SIM_COOKIE}.${i}`, part, opts)
    else jar.delete(`${SIM_COOKIE}.${i}`)
  }
}

/** Descarta todo o rascunho. */
export async function clearSimulation(): Promise<void> {
  const jar = await cookies()
  for (let i = 0; i < MAX_CHUNKS; i++) jar.delete(`${SIM_COOKIE}.${i}`)
}

/** Altera o rascunho da simulação ativa e grava. */
export async function updateSimulation(sim: Simulation, change: (s: SimState) => void): Promise<void> {
  const state = structuredClone(sim.state)
  change(state)
  const { cohortVM: _cohort, ...payload } = sim
  void _cohort
  await writeSimulation({ ...payload, state })
}
