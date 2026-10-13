import { EmptyState } from '@portal/ui/empty-state'
import { IconArrowRight } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Coordenação' }

export default function CoordinationPage() {
  return (
    <>
      <PageTitle eyebrow="Coordenação" title="Visão da turma" lead="Para a coordenação acompanhar a formação e identificar lacunas." />
      <Link href="/coordenacao/biblioteca" className="glass glass-interactive group mb-8 flex items-center justify-between gap-4 rounded-2xl p-5">
        <span>
          <span className="eyebrow block text-[10px]">Disponível</span>
          <span className="mt-1 block text-lg font-light">Progresso na biblioteca</span>
          <span className="mt-1 block text-sm text-muted">Quem concluiu, quem está assistindo e quem ainda não começou — por aluno, por conteúdo e por módulo.</span>
        </span>
        <IconArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Link>
      <EmptyState stage="Etapa 11" title="O que vai existir aqui">
        <ul className="list-disc space-y-1 pl-5">
          <li>Casos registrados, procedimentos e evolução mensal</li>
          <li>Procedimentos pouco realizados pela turma</li>
          <li>Dificuldades mais relatadas, por tema</li>
          <li>Alunos com pouca exposição clínica</li>
          <li>Caso individual com identificador do paciente (iniciais/código), com registro de acesso</li>
        </ul>
      </EmptyState>
    </>
  )
}
