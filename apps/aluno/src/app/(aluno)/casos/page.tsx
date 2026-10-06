import { ButtonLink } from '@portal/ui/button'
import { IconPlus } from '@portal/ui/icons'
import type { Metadata } from 'next'
import { Planned } from '@/components/Planned'

export const metadata: Metadata = { title: 'Meus casos' }

export default function Page() {
  return (
    <>
      <div className="flex justify-end">
        <ButtonLink href="/casos/novo">
          <IconPlus size={18} /> Registrar caso
        </ButtonLink>
      </div>
      <Planned
        eyebrow="Clínica"
        title="Meus casos"
        lead="Os pacientes que você atendeu na especialização, identificados por iniciais ou código."
        stage="Etapas 6 a 8"
        items={[
          'Registro rápido do que foi feito (menos de 1 minuto)',
          '"Descrever o que fiz": a IA sugere procedimento, dentes e temas para você conferir',
          'Maior dificuldade e maior facilidade em cada caso',
          'Mapa de tratamento: a sequência de consultas em colunas',
          'Botão para abrir o caso no Smile Cloud',
        ]}
      />
    </>
  )
}
