'use server'

import { revalidatePath } from 'next/cache'
import { studentGate } from '@/lib/simulation/gate'
import { updateSimulation } from '@/lib/simulation/session'
import { SimError, simSetProgress } from '@/lib/simulation/state'

/**
 * Progresso do aluno na biblioteca. Cada pessoa grava só o próprio progresso e só de conteúdo que pode ver
 * (a RLS confere de novo no banco). Nesta parte o progresso é manual; o vídeo passa a ser automático na Parte 2.
 */
export async function setContentDone(_: unknown, fd: FormData): Promise<{ erro?: string } | undefined> {
  const gate = await studentGate()
  if (gate.kind === 'blocked') return { erro: gate.reason }
  const contentId = String(fd.get('conteudo') ?? '')
  if (!/^[0-9a-f-]{36}$/.test(contentId)) return { erro: 'Conteúdo inválido.' }
  const done = fd.get('concluido') === 'sim'
  if (gate.kind === 'sim') {
    // Simulação: só no rascunho.
    try {
      const now = new Date().toISOString()
      const prev = gate.sim.state.progress[contentId]
      await updateSimulation(gate.sim, (st) =>
        simSetProgress(st, contentId, { status: done ? 'concluido' : 'iniciado', percent: done ? 100 : (prev?.percent ?? 0), positionSeconds: prev?.positionSeconds ?? 0, completedAt: done ? now : null }, now),
      )
    } catch (e) {
      return { erro: e instanceof SimError ? e.message : 'Não foi possível salvar o progresso.' }
    }
    revalidatePath('/', 'layout')
    return undefined
  }
  const { auth, db: supabase } = gate
  const { error } = await supabase
    .from('content_progress')
    .upsert({ user_id: auth.userId, content_id: contentId, status: done ? 'concluido' : 'iniciado' }, { onConflict: 'user_id,content_id' })
  if (error) return { erro: 'Não foi possível salvar o progresso.' }
  revalidatePath('/biblioteca', 'layout')
  revalidatePath('/modulos', 'layout')
  return undefined
}

/**
 * Progresso automático do vídeo (chamado pelo player a cada ~15 s, ao pausar e ao terminar).
 * Concluído aos 90%; quem já concluiu continua concluído (desmarcar é só pelo botão).
 */
export async function saveVideoProgress(contentId: string, seconds: number, duration: number): Promise<void> {
  const gate = await studentGate()
  if (gate.kind === 'blocked' || !/^[0-9a-f-]{36}$/.test(contentId)) return
  if (!Number.isFinite(seconds) || !Number.isFinite(duration) || seconds < 0 || duration <= 0 || duration > 86_400) return
  const { videoProgress } = await import('@/lib/video/bunny')
  if (gate.kind === 'sim') {
    const prevSim = gate.sim.state.progress[contentId]
    const r = videoProgress(Math.min(seconds, duration), duration, prevSim?.status === 'concluido')
    const now = new Date().toISOString()
    try {
      await updateSimulation(gate.sim, (st) =>
        simSetProgress(st, contentId, { status: r.status, percent: r.percent, positionSeconds: r.position_seconds, completedAt: r.status === 'concluido' ? (prevSim?.completedAt ?? now) : null }, now),
      )
    } catch {
      return
    }
    if (r.status === 'concluido' && prevSim?.status !== 'concluido') revalidatePath('/', 'layout')
    return
  }
  const { auth, db: supabase } = gate
  const { data: prev } = await supabase.from('content_progress').select('status').eq('user_id', auth.userId).eq('content_id', contentId).maybeSingle()
  const row = videoProgress(Math.min(seconds, duration), duration, prev?.status === 'concluido')
  await supabase.from('content_progress').upsert({ user_id: auth.userId, content_id: contentId, ...row }, { onConflict: 'user_id,content_id' })
  if (row.status === 'concluido' && prev?.status !== 'concluido') {
    revalidatePath('/biblioteca', 'layout')
    revalidatePath('/modulos', 'layout')
  }
}
