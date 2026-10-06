/**
 * Playbook de estratificação — Thiago Ottoboni.
 * O fluxo é linear (as respostas mudam a conduta, não a ordem das etapas), então o
 * estado inteiro cabe em "quantos passos foram concluídos" + as respostas dadas.
 */

export type Answer = 'sim' | 'nao'

export type Stage = {
  id: 'palatina' | 'substrato' | 'dentina' | 'maquiagem' | 'vestibular'
  number: number
  title: string
}

export type QuestionStep = {
  kind: 'question'
  id: string
  stage: Stage['id']
  question: string
  sim: string
  nao: string
}

export type InfoStep = {
  kind: 'info'
  id: string
  stage: Stage['id']
  text: string
  /** Opções marcáveis (efeitos ópticos da maquiagem). */
  options?: readonly string[]
}

export type Step = QuestionStep | InfoStep

export const NEXT_STAGE = 'Seguir para a próxima etapa.'

export const stages: readonly Stage[] = [
  { id: 'palatina', number: 1, title: 'Palatina' },
  { id: 'substrato', number: 2, title: 'Substrato' },
  { id: 'dentina', number: 3, title: 'Dentina' },
  { id: 'maquiagem', number: 4, title: 'Maquiagem' },
  { id: 'vestibular', number: 5, title: 'Vestibular' },
]

export const opticalEffects = ['Ocre', 'Blue', 'Violeta', 'White', 'Gray', 'Clear'] as const

export const steps: readonly Step[] = [
  {
    kind: 'question',
    id: 'proximal',
    stage: 'palatina',
    question: 'Irá trabalhar com parede proximal?',
    sim: 'Utilizar a mesma resina da camada vestibular.',
    nao: NEXT_STAGE,
  },
  {
    kind: 'question',
    id: 'ajuste-incisal',
    stage: 'palatina',
    question: 'Precisa realizar ajuste incisal na concha palatina?',
    sim: 'Disco de lixa com rotação lenta (sem água) › jato de ar › bond/wetting › afinar com jato.',
    nao: NEXT_STAGE,
  },
  {
    kind: 'question',
    id: 'substrato',
    stage: 'substrato',
    question: 'O substrato está escurecido/diferente do conjunto?',
    sim: 'Opacificar com LCO + dentina.',
    nao: NEXT_STAGE,
  },
  {
    kind: 'info',
    id: 'dentina',
    stage: 'dentina',
    text: 'Objetivo: equalizar COR / FORMA / VOLUME.',
  },
  {
    kind: 'info',
    id: 'maquiagem',
    stage: 'maquiagem',
    text: 'Efeitos ópticos — podem ser utilizados: Ocre, Blue, Violeta, White, Gray e Clear.',
    options: opticalEffects,
  },
  {
    kind: 'info',
    id: 'vestibular',
    stage: 'vestibular',
    text: 'Camada que receberá polimento e textura.',
  },
]

export type PlaybookState = {
  /** Quantos passos de `steps` já foram concluídos. */
  done: number
  answers: Record<string, Answer>
  effects: string[]
}

export const initialState: PlaybookState = { done: 0, answers: {}, effects: [] }

export function stageOf(id: Stage['id']): Stage {
  return stages.find((s) => s.id === id)!
}

/** Etapa em andamento (ou null quando o fluxo terminou). */
export function currentStage(state: PlaybookState): Stage | null {
  const step = steps[state.done]
  return step ? stageOf(step.stage) : null
}

export function stageStatus(state: PlaybookState, id: Stage['id']): 'done' | 'current' | 'todo' {
  const indexes = steps.flatMap((s, i) => (s.stage === id ? [i] : []))
  if (indexes.every((i) => i < state.done)) return 'done'
  if (indexes.some((i) => i === state.done)) return 'current'
  return 'todo'
}

export function conduct(step: QuestionStep, answer: Answer): string {
  return answer === 'sim' ? step.sim : step.nao
}

/** Protocolo final, etapa por etapa — só o que muda o procedimento. */
export function buildProtocol(state: PlaybookState): { stage: Stage; items: string[] }[] {
  return stages.map((stage) => {
    const items: string[] = []
    for (const step of steps) {
      if (step.stage !== stage.id) continue
      if (step.kind === 'question') {
        if (state.answers[step.id] === 'sim') items.push(step.sim)
      } else if (step.options) {
        items.push(
          state.effects.length
            ? `Efeitos ópticos: ${step.options.filter((o) => state.effects.includes(o)).join(', ')}.`
            : 'Sem efeitos ópticos.',
        )
      } else {
        items.push(step.text)
      }
    }
    return { stage, items: items.length ? items : ['Sem ajustes — seguir para a próxima etapa.'] }
  })
}

export function protocolText(state: PlaybookState): string {
  const lines = buildProtocol(state).flatMap(({ stage, items }) => [
    `${stage.number}. ${stage.title.toUpperCase()}`,
    ...items.map((i) => `   • ${i}`),
  ])
  return ['PLAYBOOK — Thiago Ottoboni', '', ...lines].join('\n')
}
