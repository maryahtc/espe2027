import type { Metadata } from 'next'
import { Planned } from '@/components/Planned'

export const metadata: Metadata = { title: 'Perfil' }

export default function Page() {
  return (
    <Planned
      eyebrow="Perfil"
      title="Minha conta e privacidade"
      lead="Seus dados de acesso e quem pode ver o quê."
      stage="Etapa 2"
      items={[
        'Trocar senha e e-mail',
        'Produção privada (padrão) ou participação na visualização da turma',
        'O que a coordenação vê e o que nunca aparece para colegas',
        'Termo de uso e aviso de privacidade',
      ]}
    />
  )
}
