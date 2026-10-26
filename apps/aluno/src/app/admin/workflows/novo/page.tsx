import type { Metadata } from 'next'
import { ADMIN_AREA, NewWorkflowPage } from '@/components/workflows/editor/pages'

export const metadata: Metadata = { title: 'Novo workflow' }

export default async function Page() {
  return <NewWorkflowPage area={ADMIN_AREA} />
}
