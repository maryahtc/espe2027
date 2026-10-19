import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StaffCasePage } from '@/components/cases/StaffCases'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Caso' }

export default async function CoordinationCasePage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(['coordenacao', 'admin'])
  if (!auth) notFound()
  return <StaffCasePage auth={auth} base="/coordenacao/casos" id={(await params).id} />
}
