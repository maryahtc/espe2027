import type { Metadata } from 'next'
import { Planned } from '@/components/Planned'

export const metadata: Metadata = { title: 'Biblioteca' }

export default function Page() {
  return (
    <Planned
      eyebrow="Aprender"
      title="Biblioteca"
      lead="Todas as aulas gravadas, artigos e materiais da especialização, num só lugar."
      stage="Etapa 4"
      items={[
        'Busca por título, docente, tema ou procedimento',
        'Filtros por categoria (Dentística, Prótese, Oclusão…), tema e tipo',
        'Continuar assistindo de onde parou',
        'Conteúdos relacionados e acesso ao Workflow clínico do mesmo tema',
      ]}
    />
  )
}
