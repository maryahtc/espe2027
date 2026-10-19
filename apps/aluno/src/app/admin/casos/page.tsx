import type { Metadata } from 'next'
import { StaffCasesPage } from '@/components/cases/StaffCases'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Casos' }

export default async function AdminCasesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireUser(['admin'])
  if (!auth) return null
  return <StaffCasesPage auth={auth} base="/admin/casos" sp={await searchParams} />
}
