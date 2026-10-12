import 'server-only'
import type { createSupabaseServerClient } from '@portal/db/server'
import { fetchVideoState, videoConfig } from './bunny'

type Db = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>

/**
 * Atualiza situação, duração e capa de um vídeo a partir do Bunny (fonte da verdade). Grava com a sessão do
 * admin (a RLS só deixa admin alterar conteúdos). Não muda nada se o Bunny não estiver configurado.
 */
export async function refreshVideoState(db: Db, contentId: string): Promise<{ status: string | null; encodeProgress: number | null }> {
  const cfg = videoConfig()
  const { data: c } = await db.from('contents').select('video_id, video_status, duration_seconds, thumbnail_url').eq('id', contentId).single()
  if (!cfg || !c?.video_id || c.video_status === 'enviando') return { status: c?.video_status ?? null, encodeProgress: null }
  const state = await fetchVideoState(cfg, c.video_id)
  const patch: { video_status?: string; duration_seconds?: number; thumbnail_url?: string } = {}
  if (state.status !== c.video_status) patch.video_status = state.status
  if (state.durationSeconds && state.durationSeconds !== c.duration_seconds) patch.duration_seconds = state.durationSeconds
  if (state.thumbnailUrl && state.thumbnailUrl !== c.thumbnail_url) patch.thumbnail_url = state.thumbnailUrl
  if (Object.keys(patch).length) await db.from('contents').update(patch).eq('id', contentId)
  return { status: state.status, encodeProgress: state.encodeProgress }
}

/** Ao abrir o painel: atualiza os vídeos que ainda estão processando (máx. 10 por vez). */
export async function refreshPendingVideos(db: Db): Promise<void> {
  if (!videoConfig()) return
  const { data } = await db.from('contents').select('id').eq('video_status', 'processando').limit(10)
  await Promise.all((data ?? []).map((r) => refreshVideoState(db, r.id).catch(() => undefined)))
}
