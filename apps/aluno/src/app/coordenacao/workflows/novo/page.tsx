import type { Metadata } from 'next'
import { COORD_AREA, NewWorkflowPage } from '@/components/workflows/editor/pages'

export const metadata: Metadata = { title: 'Novo workflow' }

export default async function Page() {
  return <NewWorkflowPage area={COORD_AREA} />
}
