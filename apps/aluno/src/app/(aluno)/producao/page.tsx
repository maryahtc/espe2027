import type { Metadata } from 'next'
import { Planned } from '@/components/Planned'

export const metadata: Metadata = { title: 'Minha produção' }

export default function Page() {
  return (
    <Planned
      eyebrow="Clínica"
      title="Minha produção"
      lead="Sua exposição clínica ao longo da especialização — para enxergar o que já fez e o que vale buscar."
      stage="Etapa 9"
      items={[
        'Total de procedimentos e distribuição por procedimento e categoria',
        'Evolução mês a mês',
        'Filtros por período, módulo, categoria e procedimento',
        'Procedimentos com pouca exposição até agora (sem linguagem de cobrança)',
      ]}
    />
  )
}
