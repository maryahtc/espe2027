import type { Metadata } from 'next'
import { AdminSidebar, AdminTopBar } from '@/components/shell/AdminNav'
import { PreviewBanner } from '@/components/shell/PreviewBanner'
import type { CSSProperties } from 'react'
import { SIM_BANNER_H, SimulationBanner } from '@/components/simulation/SimulationBanner'
import { requireUser } from '@/lib/auth/session'
import { getSimulation } from '@/lib/simulation/session'

export const metadata: Metadata = { title: { default: 'Administração', template: '%s · Admin · Conexo' } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireUser(['admin'])
  const sim = auth ? await getSimulation() : null
  return (
    <div style={{ '--sim-h': sim ? SIM_BANNER_H : '0px' } as CSSProperties}>
      {sim ? <SimulationBanner backToStudent cohortName={sim.cohortVM.name} expiresAt={sim.expiresAt} /> : null}
      <div className="flex min-h-dvh">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          {!auth ? <PreviewBanner /> : null}
          <AdminTopBar />
          <main id="conteudo" className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-16 sm:px-6 lg:px-12 lg:pt-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
