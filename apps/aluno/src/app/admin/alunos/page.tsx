import type { Metadata } from 'next'
import { PeoplePage } from '@/components/admin/people/PeoplePage'

export const metadata: Metadata = { title: 'Alunos' }

export default function AdminStudentsPage() {
  return (
    <PeoplePage
      title="Alunos"
      lead="Convites, matrículas e acesso. A conta nasce pelo convite; a senha, quem cria é o próprio aluno."
      roles={['aluno']}
      filter={(p) => p.role === 'aluno'}
      inviteTitle="Convidar aluno"
    />
  )
}
