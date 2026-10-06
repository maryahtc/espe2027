import type { Metadata } from 'next'
import { Planned } from '@/components/Planned'

export const metadata: Metadata = { title: 'Workflow clínico' }

export default function Page() {
  return (
    <Planned
      eyebrow="Pensar"
      title="Workflow clínico"
      lead="Cenários de raciocínio clínico: perguntas, critérios e caminhos possíveis — para aprender a decidir, não para receber a resposta."
      stage="Etapa 10"
      items={[
        'Cenários publicados pela coordenação (ex.: alteração estética anterior)',
        'Uma pergunta por vez, com orientações e alertas',
        'Conteúdos da biblioteca para aprofundar em cada ponto',
        'Caminhos clínicos possíveis e os critérios de cada um',
      ]}
    />
  )
}
