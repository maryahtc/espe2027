import { EmptyState } from '@portal/ui/empty-state'
import { PageTitle } from '@portal/ui/section'

/** Pessoa sem matrícula ativa: explica em vez de mostrar uma tela vazia. */
export function NoCohort({ title }: { title: string }) {
  return (
    <>
      <PageTitle title={title} />
      <EmptyState title="Sua turma ainda não foi vinculada">
        Assim que a coordenação vincular sua conta a uma turma, o cronograma e os módulos aparecem aqui.
      </EmptyState>
    </>
  )
}
