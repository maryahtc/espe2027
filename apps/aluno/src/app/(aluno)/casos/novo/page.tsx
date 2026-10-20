import { EmptyState } from '@portal/ui/empty-state'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { QuickRegister } from '@/components/cases/QuickRegister'
import { studentArea } from '@/lib/academic/student'
import { requireUser } from '@/lib/auth/session'
import { loadRegistration } from '@/lib/cases/load'
import { caseHeadline, topOptions } from '@/lib/cases/model'

export const metadata: Metadata = { title: 'Registrar' }

/** Registro rápido: o que o aluno fez hoje, em caso novo ou em andamento (meta: 20–30 s no celular). */
export default async function NewRecordPage({ searchParams }: { searchParams: Promise<{ caso?: string }> }) {
  const auth = await requireUser()
  const area = await studentArea()
  if (!auth || !area) {
    return (
      <EmptyState title="Registro de casos indisponível">Assim que sua conta estiver vinculada a uma turma, você registra seus casos aqui.</EmptyState>
    )
  }
  const { caso } = await searchParams
  const r = await loadRegistration(auth, area.cohort.id)
  const initial = r.openCases.find((c) => c.id === caso)?.id ?? null
  return (
    <div className="max-w-3xl">
      <Link href={initial ? `/casos/${initial}` : '/casos'} className="text-sm text-muted hover:text-ink">
        ← {initial ? 'Voltar ao caso' : 'Meus casos'}
      </Link>
      <PageTitle eyebrow="Clínica" title="Registrar" lead="Paciente, data e o que você fez. O resto pode ser completado depois." />
      {r.allowed ? (
        <QuickRegister
          options={r.options}
          top={topOptions(r.options, r.history)}
          openCases={r.openCases.map((c) => ({ id: c.id, patientLabel: c.patientLabel, headline: caseHeadline(c, r.options), lastActivityOn: c.lastActivityOn }))}
          modules={r.modules}
          today={area.today}
          supervisors={r.supervisors}
          topics={r.topics}
          initialCaseId={initial}
        />
      ) : (
        <EmptyState title="Esta conta não pode registrar casos agora">
          {auth.role !== 'aluno'
            ? `Você entrou com uma conta de ${auth.role === 'admin' ? 'administração' : 'coordenação'}. Os casos são registrados pelo próprio aluno: entre com a conta de aluno para registrar.`
            : area.cohort.status === 'encerrada'
              ? 'Sua turma foi encerrada: os casos ficam disponíveis só para consulta.'
              : 'Sua matrícula nesta turma não está ativa como aluno. Fale com a coordenação para liberar o registro de casos.'}
        </EmptyState>
      )}
    </div>
  )
}
