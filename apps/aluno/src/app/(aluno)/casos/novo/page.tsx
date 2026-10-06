import type { Metadata } from 'next'
import { Planned } from '@/components/Planned'

export const metadata: Metadata = { title: 'Registrar caso' }

export default function Page() {
  return (
    <Planned
      eyebrow="Clínica"
      title="Registrar caso"
      lead="Paciente (iniciais ou código), data e o que você fez. O resto pode ser completado depois."
      stage="Etapa 6"
      items={[
        'Procedimentos mais usados no topo, busca com sinônimos',
        'Quantidade na unidade do procedimento (dente, peça, arcada ou caso)',
        'Dentes envolvidos e link do Smile Cloud, opcionais',
        'Dificuldade, facilidade e "faria diferente?"',
      ]}
    />
  )
}
