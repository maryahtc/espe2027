import type { Metadata } from 'next'
import { TrackingPage } from '@/components/tracking/TrackingPage'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Progresso na biblioteca' }

export default async function CoordinationTrackingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireUser(['coordenacao', 'admin'])
  if (!auth) return null
  return <TrackingPage auth={auth} base="/coordenacao/biblioteca" sp={await searchParams} />
}
