import 'server-only'
import { createSupabaseServerClient } from '@portal/db/server'
import { redirect } from 'next/navigation'
import { getAuth } from '@/lib/auth/session'
import { getSimulation, simulationStatus } from './session'
import { simNeedsTerms } from './state'

/**
 * Chamado no início de cada página do aluno (as páginas rodam a cada navegação; o layout não):
 * - Admin só percorre o portal do aluno pelo Modo de simulação — fora dele, vai ao seletor. Também cobre a
 *   simulação que expira no meio da navegação. `ownProfile`: o Perfil, com nome e senha da própria conta Admin.
 * - Na simulação, aluno novo começa pelo aceite do termo (só no rascunho).
 */
export async function guardStudentPage(opts: { ownProfile?: boolean } = {}): Promise<void> {
  const auth = await getAuth()
  if (!auth || auth === 'previa') return
  const sim = await getSimulation()
  if (auth.role === 'admin' && !sim && !opts.ownProfile) {
    redirect(`/admin/simulacao${(await simulationStatus()) === 'expirada' ? '?expirou=1' : ''}`)
  }
  if (sim) {
    const supabase = await createSupabaseServerClient()
    const { data: current } = supabase ? await supabase.rpc('current_terms_version_id') : { data: null }
    if (simNeedsTerms(sim.state, current ?? null)) redirect('/termo')
  }
}
