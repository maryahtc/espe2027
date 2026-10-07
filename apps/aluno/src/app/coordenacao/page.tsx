import type { Metadata } from 'next'
import { EmptyState } from '@portal/ui/empty-state'
import { PageTitle } from '@portal/ui/section'
import { Logo } from '@/components/shell/Logo'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { PreviewBanner } from '@/components/shell/PreviewBanner'
import { requireUser } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Coordenação' }

export default async function CoordinationPage() {
  await requireUser(['coordenacao', 'admin'])
  return (
    <>
      <PreviewBanner />
      <header className="flex h-16 items-center border-b border-rule bg-surface px-4 sm:px-8">
        <Logo href="/coordenacao" />
        <span className="eyebrow ml-4 text-signal">Coordenação</span>
        <SignOutButton className="ml-auto" quiet />
      </header>
      <main id="conteudo" className="mx-auto max-w-[1120px] px-4 py-10 sm:px-8">
        <PageTitle eyebrow="Turma 2027" title="Visão da turma" lead="Para a coordenação acompanhar a formação e identificar lacunas." />
        <EmptyState stage="Etapa 11" title="O que vai existir aqui">
          <ul className="list-disc space-y-1 pl-5">
            <li>Casos registrados, procedimentos e evolução mensal</li>
            <li>Procedimentos pouco realizados pela turma</li>
            <li>Dificuldades mais relatadas, por tema</li>
            <li>Alunos com pouca exposição clínica</li>
            <li>Caso individual com identificador do paciente (iniciais/código), com registro de acesso</li>
          </ul>
        </EmptyState>
      </main>
    </>
  )
}
