'use server'

import { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser, safeNext } from '@/lib/auth/session'
import { simulationAvailable } from './seal'
import { clearSimulation, getSimulation, writeSimulation } from './session'
import { emptyState, SIM_DURATION_MS } from './state'

/** Admin entra no Modo de simulação de uma turma: começa como aluno novo, com rascunho vazio. */
export async function startSimulation(fd: FormData): Promise<void> {
  const auth = await requireUser(['admin'])
  const db = await createSupabaseServerClient()
  if (!auth || !db || !simulationAvailable()) redirect('/admin/simulacao?erro=indisponivel')
  const cohortId = String(fd.get('turma') ?? '')
  const { data: cohort } = /^[0-9a-f-]{36}$/.test(cohortId) ? await db.from('cohorts').select('id').eq('id', cohortId).maybeSingle() : { data: null }
  if (!cohort) redirect('/admin/simulacao?erro=turma')
  const now = Date.now()
  await writeSimulation({ v: 1, admin: auth.userId, cohort: cohort.id, startedAt: now, expiresAt: now + SIM_DURATION_MS, state: emptyState() })
  revalidatePath('/', 'layout')
  redirect(safeNext(fd.get('voltar')) ?? '/')
}

/** Sair: descarta todo o rascunho e volta ao Admin. */
export async function exitSimulation(): Promise<void> {
  await clearSimulation()
  revalidatePath('/', 'layout')
  redirect('/admin/simulacao?saiu=1')
}

/**
 * Admin → Turma → "Pré-visualizar" a Início numa data (Etapa 5), agora dentro do Modo de simulação daquela turma.
 * Reaproveita a simulação ativa da mesma turma; senão começa uma nova, já com o termo aceito no rascunho (o objetivo
 * aqui é ver a Início naquela data). Nada é gravado no banco.
 */
export async function previewHome(fd: FormData): Promise<void> {
  const auth = await requireUser(['admin'])
  const db = await createSupabaseServerClient()
  if (!auth || !db || !simulationAvailable()) redirect('/admin/simulacao?erro=indisponivel')
  const cohortId = String(fd.get('turma') ?? '')
  const date = String(fd.get('data') ?? '')
  const { data: cohort } = /^[0-9a-f-]{36}$/.test(cohortId) ? await db.from('cohorts').select('id').eq('id', cohortId).maybeSingle() : { data: null }
  if (!cohort) redirect('/admin/simulacao?erro=turma')
  const current = await getSimulation()
  if (!current || current.cohort !== cohort.id) {
    const { data: version } = await db.rpc('current_terms_version_id')
    const now = Date.now()
    const state = emptyState()
    if (version) state.terms = { versionId: version, at: new Date(now).toISOString() }
    await writeSimulation({ v: 1, admin: auth.userId, cohort: cohort.id, startedAt: now, expiresAt: now + SIM_DURATION_MS, state })
  }
  revalidatePath('/', 'layout')
  redirect(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `/?data=${date}` : '/')
}
