import type { Metadata } from 'next'
import Link from 'next/link'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { Logo } from '@/components/shell/Logo'
import { PreviewBanner } from '@/components/shell/PreviewBanner'
import { SimulationBanner } from '@/components/simulation/SimulationBanner'
import { requireUser } from '@/lib/auth/session'
import { getSimulation } from '@/lib/simulation/session'

export const metadata: Metadata = { title: { default: 'Coordenação', template: '%s · Coordenação · Conexo' } }

/** Área da coordenação (leitura): só coordenação e admin. */
export default async function CoordinationLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireUser(['coordenacao', 'admin'])
  const sim = auth ? await getSimulation() : null
  return (
    <>
      {sim ? <SimulationBanner backToStudent cohortName={sim.cohortVM.name} expiresAt={sim.expiresAt} /> : null}
      {!auth ? <PreviewBanner /> : null}
      <header className="flex h-16 items-center gap-6 border-b border-rule bg-surface px-4 sm:px-8">
        <Logo href="/coordenacao" />
        <span className="eyebrow text-signal">Coordenação</span>
        <nav aria-label="Coordenação" className="hidden gap-5 text-sm sm:flex">
          <Link href="/coordenacao" className="text-muted hover:text-ink">
            Visão da turma
          </Link>
          <Link href="/coordenacao/biblioteca" className="text-muted hover:text-ink">
            Progresso na biblioteca
          </Link>
          <Link href="/coordenacao/casos" className="text-muted hover:text-ink">
            Casos da turma
          </Link>
          <Link href="/coordenacao/avisos" className="text-muted hover:text-ink">
            Avisos
          </Link>
          <Link href="/" className="text-muted hover:text-ink">
            Portal do aluno
          </Link>
        </nav>
        <SignOutButton className="ml-auto" quiet />
      </header>
      <main id="conteudo" className="mx-auto max-w-[1120px] px-4 py-10 sm:px-8">
        {children}
      </main>
    </>
  )
}
