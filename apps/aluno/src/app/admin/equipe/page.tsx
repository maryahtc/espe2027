import type { Metadata } from 'next'
import { FacultyManager } from '@/components/admin/academic/FacultyManager'
import { PeoplePage } from '@/components/admin/people/PeoplePage'
import { loadFaculty } from '@/lib/academic/load'

export const metadata: Metadata = { title: 'Docentes e coordenação' }

export default async function AdminTeamPage() {
  const faculty = await loadFaculty()
  return (
    <PeoplePage
      title="Docentes e coordenação"
      lead="Quem acompanha a turma e quem administra o portal."
      roles={['coordenacao', 'admin']}
      filter={(p) => p.role !== 'aluno'}
      inviteTitle="Convidar coordenação ou administração"
      note={<FacultyManager faculty={faculty} />}
    />
  )
}
