'use server'

import { createSupabaseServerClient } from '@portal/db/server'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/session'

/**
 * Progresso do aluno na biblioteca. Cada pessoa grava só o próprio progresso e só de conteúdo que pode ver
 * (a RLS confere de novo no banco). Nesta parte o progresso é manual; o vídeo passa a ser automático na Parte 2.
 */
export async function setContentDone(_: unknown, fd: FormData): Promise<{ erro?: string } | undefined> {
  const auth = await requireUser()
  const supabase = await createSupabaseServerClient()
  if (!auth || !supabase) return { erro: 'Indisponível nesta prévia.' }
  const contentId = String(fd.get('conteudo') ?? '')
  if (!/^[0-9a-f-]{36}$/.test(contentId)) return { erro: 'Conteúdo inválido.' }
  const done = fd.get('concluido') === 'sim'
  const { error } = await supabase
    .from('content_progress')
    .upsert({ user_id: auth.userId, content_id: contentId, status: done ? 'concluido' : 'iniciado' }, { onConflict: 'user_id,content_id' })
  if (error) return { erro: 'Não foi possível salvar o progresso.' }
  revalidatePath('/biblioteca', 'layout')
  revalidatePath('/modulos', 'layout')
  return undefined
}
