import type { Metadata } from 'next'
import { StaffCasesPage } from '@/components/cases/StaffCases'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Casos da turma' }

export default async function CoordinationCasesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireUser(['coordenacao', 'admin'])
  if (!auth) return null
  return <StaffCasesPage auth={auth} base="/coordenacao/casos" sp={await searchParams} />
}
