import { EmptyState } from '@portal/ui/empty-state'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { Input } from '@/components/admin/academic/ui'
import { LogisticsBoardView } from '@/components/logistics/LogisticsBoard'
import { requireUser } from '@/lib/auth/session'
import { saveFacultyContact } from '@/lib/logistics/actions'
import { loadLogisticsBoard } from '@/lib/logistics/load'
import { logisticsReady } from '@/lib/logistics/schema'
import { createSupabaseServerClient } from '@portal/db/server'

export const metadata: Metadata = { title: 'Agenda do professor' }

/** Agenda de um professor nos módulos (equipe, atividades, participação e logística) e o contato (só Admin). */
export default async function TeacherAgendaPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(['admin'])
  if (!auth) notFound()
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id) || !(await logisticsReady())) notFound()
  const db = await createSupabaseServerClient()
  if (!db) notFound()
  const [{ data: f }, { data: contact }, board] = await Promise.all([
    db.from('faculty').select('id, display_name, full_name, kind').eq('id', id).maybeSingle(),
    db.from('faculty_contacts').select('email, phone, city, notes').eq('faculty_id', id).maybeSingle(),
    loadLogisticsBoard(auth, { scope: 'todos', facultyId: id }),
  ])
  if (!f || !board) notFound()
  return (
    <div data-agenda-professor={id}>
      <Link href="/admin/professores" className="text-sm text-muted hover:text-ink">
        ← Professores e logística
      </Link>
      <div className="mt-4">
        <PageTitle eyebrow="Agenda do professor" title={f.display_name} lead={f.full_name !== f.display_name ? f.full_name : undefined} />
      </div>
      <details className="glass rounded-2xl p-4 sm:p-5" open={!contact} data-contato-form>
        <summary className="cursor-pointer text-[15px] font-semibold">Contato {contact ? '' : '(ainda não cadastrado)'}</summary>
        <ActionForm action={saveFacultyContact} submit="Salvar contato" className="mt-4">
          <input type="hidden" name="professor" value={id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Cidade de origem" name="cidade" maxLength={120} defaultValue={contact?.city ?? ''} />
            <Input label="Telefone" name="telefone" maxLength={40} defaultValue={contact?.phone ?? ''} />
            <Input label="E-mail" name="email" type="email" maxLength={200} defaultValue={contact?.email ?? ''} />
          </div>
          <Input label="Observações (opcional)" name="obs" maxLength={1000} defaultValue={contact?.notes ?? ''} />
        </ActionForm>
        <p className="mt-3 text-xs text-muted">A coordenação das turmas em que este professor atua consulta o contato; edição só pelo Admin. Cachê fica para a Gestão Financeira.</p>
      </details>
      <h2 className="mt-10 text-2xl font-light tracking-tight">Módulos</h2>
      <div className="rule-brand mt-2 mb-6 w-12" />
      {board.modules.length ? (
        <LogisticsBoardView board={board} path={`/admin/professores/${id}`} filter="todas" />
      ) : (
        <EmptyState title="Sem módulos">Este professor ainda não está na programação nem na equipe de nenhum módulo.</EmptyState>
      )}
    </div>
  )
}
