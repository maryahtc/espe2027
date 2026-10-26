import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { requireUser } from '@/lib/auth/session'
import type { Role } from '@/lib/auth/flow'
import { workflowsReady } from './schema'

/**
 * Entrada das telas do editor. `antigo`: o banco ainda não tem a Etapa 9 (nenhuma consulta às tabelas novas).
 * `inativo`: perfil de coordenação sem matrícula de coordenação ativa em turma ativa (a RLS não deixaria editar).
 */
export type EditorGate = { state: 'ok' } | { state: 'antigo' } | { state: 'inativo' }

export async function editorGate(roles: Role[]): Promise<EditorGate> {
  await requireUser(roles)
  if (!(await workflowsReady())) return { state: 'antigo' }
  const supabase = await createSupabaseServerClient()
  if (!supabase) return { state: 'antigo' }
  const { data } = await supabase.rpc('workflow_editor')
  return data === true ? { state: 'ok' } : { state: 'inativo' }
}
