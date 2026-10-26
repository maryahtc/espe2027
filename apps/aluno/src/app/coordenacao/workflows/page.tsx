import type { Metadata } from 'next'
import { COORD_AREA, WorkflowListPage } from '@/components/workflows/editor/pages'

export const metadata: Metadata = { title: 'Workflows clínicos' }

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <WorkflowListPage area={COORD_AREA} searchParams={await searchParams} />
}
