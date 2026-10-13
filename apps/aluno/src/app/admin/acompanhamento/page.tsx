import type { Metadata } from 'next'
import { TrackingPage } from '@/components/tracking/TrackingPage'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Progresso na biblioteca' }

export default async function AdminTrackingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireUser(['admin'])
  if (!auth) return null
  return <TrackingPage auth={auth} base="/admin/acompanhamento" sp={await searchParams} />
}
