import type { Metadata } from 'next'
import { AdminSidebar, AdminTopBar } from '@/components/shell/AdminNav'
import { PreviewBanner } from '@/components/shell/PreviewBanner'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: { default: 'Administração', template: '%s · Admin · Conexo' } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser(['admin'])
  return (
    <div className="flex min-h-dvh">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <PreviewBanner />
        <AdminTopBar />
        <main id="conteudo" className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-16 sm:px-6 lg:px-12 lg:pt-10">
          {children}
        </main>
      </div>
    </div>
  )
}
