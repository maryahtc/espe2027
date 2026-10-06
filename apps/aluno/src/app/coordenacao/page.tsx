import type { Metadata } from 'next'
import { Planned } from '@/components/Planned'
import { Logo } from '@/components/shell/Logo'
import { PreviewBanner } from '@/components/shell/PreviewBanner'

export const metadata: Metadata = { title: 'Coordenação' }

export default function CoordinationPage() {
  return (
    <>
      <PreviewBanner />
      <header className="flex h-16 items-center border-b border-rule bg-surface px-4 sm:px-8">
        <Logo href="/coordenacao" />
        <span className="eyebrow ml-4 text-brand">Coordenação</span>
      </header>
      <main id="conteudo" className="mx-auto max-w-[1120px] px-4 py-10 sm:px-8">
        <Planned
          eyebrow="Turma 2027"
          title="Visão da turma"
          lead="Para a coordenação acompanhar a formação e identificar lacunas."
          stage="Etapa 11"
          items={[
            'Casos registrados, procedimentos e evolução mensal',
            'Procedimentos pouco realizados pela turma',
            'Dificuldades mais relatadas, por tema',
            'Alunos com pouca exposição clínica',
            'Caso individual com identificador do paciente (iniciais/código), com registro de acesso',
          ]}
        />
      </main>
    </>
  )
}
