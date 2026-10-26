import type { Metadata } from 'next'
import { COORD_AREA, WorkflowEditorPage } from '@/components/workflows/editor/pages'

export const metadata: Metadata = { title: 'Workflow clínico' }

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params
  return <WorkflowEditorPage area={COORD_AREA} id={id} searchParams={await searchParams} />
}
