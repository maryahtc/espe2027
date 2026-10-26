import type { Metadata } from 'next'
import { COORD_AREA, StageEditorPage } from '@/components/workflows/editor/pages'

export const metadata: Metadata = { title: 'Etapa do workflow' }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; etapa: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id, etapa } = await params
  return <StageEditorPage area={COORD_AREA} id={id} stageId={etapa} searchParams={await searchParams} />
}
