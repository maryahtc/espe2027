import { EmptyState } from '@portal/ui/empty-state'
import type { Metadata } from 'next'
import { PeoplePage } from '@/components/admin/people/PeoplePage'

export const metadata: Metadata = { title: 'Docentes e coordenação' }

export default function AdminTeamPage() {
  return (
    <PeoplePage
      title="Docentes e coordenação"
      lead="Quem acompanha a turma e quem administra o portal. Os dois papéis exigem verificação em duas etapas."
      roles={['coordenacao', 'admin']}
      filter={(p) => p.role !== 'aluno'}
      inviteTitle="Convidar coordenação ou administração"
      note={
        <EmptyState stage="Etapa 3" title="Docentes">
          Docente é cadastro de conteúdo (nome, especialidade e foto), sem login: aparece no cronograma e nas aulas.
        </EmptyState>
      }
    />
  )
}
