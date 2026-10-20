import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { PreviewBanner } from '@/components/shell/PreviewBanner'
import { SIM_BANNER_H, SimulationBanner } from '@/components/simulation/SimulationBanner'
import { student } from '@/demo/data'
import { currentCohort } from '@/lib/academic/load'
import { requireUser } from '@/lib/auth/session'
import { SIM_STUDENT_INITIALS, SIM_STUDENT_NAME } from '@/lib/simulation/labels'
import { getSimulation } from '@/lib/simulation/session'
import { StudentBottomNav, StudentSidebar, StudentTopBar } from '@/components/shell/StudentNav'

export async function generateMetadata(): Promise<Metadata> {
  // Na simulação, a aba do navegador também avisa.
  return (await getSimulation()) ? { title: { default: '[Simulação] Portal do Aluno · Conexo', template: '[Simulação] %s · Conexo' } } : {}
}

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireUser()
  const sim = auth ? await getSimulation() : null
  // Regras de acesso da simulação (Admin fora dela, termo do rascunho): em template.tsx, conferidas a cada navegação.
  const cohort = auth ? await currentCohort() : null
  // Sem Supabase (modo prévia), mantém a pessoa fictícia da Etapa 1.
  const name = sim ? SIM_STUDENT_NAME : auth ? (auth.displayName || auth.fullName || auth.email).trim() : student.name
  const viewer = {
    name,
    initials: sim
      ? SIM_STUDENT_INITIALS
      : auth
        ? name
            .split(/[\s@.]+/)
            .filter(Boolean)
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
        : student.initials,
    cohort: auth ? (cohort?.name.split('|').at(-1)?.trim() ?? '') : student.cohort,
  }
  return (
    <div style={{ '--sim-h': sim ? SIM_BANNER_H : '0px' } as CSSProperties} data-simulacao={sim ? 'ativa' : undefined}>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-on-ink"
      >
        Pular para o conteúdo
      </a>
      {sim ? <SimulationBanner cohortName={sim.cohortVM.name} expiresAt={sim.expiresAt} /> : null}
      <div className="flex min-h-dvh">
        <StudentSidebar viewer={viewer} />
        <div className="min-w-0 flex-1">
          {/* Sem Supabase (modo prévia) tudo é fictício; com banco, o aviso fica só nas telas ainda fictícias. */}
          {!auth ? <PreviewBanner /> : null}
          <StudentTopBar viewer={viewer} />
          <main id="conteudo" className="mx-auto w-full max-w-[1120px] px-4 pt-6 pb-28 sm:px-6 lg:px-12 lg:pt-10 lg:pb-20">
            {children}
          </main>
        </div>
      </div>
      <StudentBottomNav />
    </div>
  )
}
