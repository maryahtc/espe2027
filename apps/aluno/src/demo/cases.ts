/** Casos FICTÍCIOS da aluna de demonstração. Pacientes identificados só por iniciais. */
import type { CivilDate } from '@/lib/dates'

export type SessionStatus = 'realizada' | 'planejada'

export type TreatmentSession = {
  number: number
  title: string
  date: CivilDate
  tasks: string[]
  notes?: string
  status: SessionStatus
}

export type PerformedProcedure = { date: CivilDate; procedure: string; quantity: number; unit: string; teeth?: string }

export type DemoCase = {
  id: string
  patient: string
  procedure: string
  teeth: string
  startDate: CivilDate
  module: number
  supervisor: string
  status: 'andamento' | 'concluido'
  summary: string
  difficulty: string
  difficultyTopics: string[]
  ease: string
  differently?: string
  performed: PerformedProcedure[]
  sessions: TreatmentSession[]
}

export const cases: DemoCase[] = [
  {
    id: 'ma-laminados',
    patient: 'M.A.',
    procedure: 'Laminados cerâmicos',
    teeth: '12, 11, 21, 22',
    startDate: '2027-08-12',
    module: 14,
    supervisor: 'Prof. Rafael Mendes',
    status: 'andamento',
    summary: 'Quatro laminados em dissilicato para fechamento de diastemas e ajuste de forma. Planejamento digital no Smile Cloud.',
    difficulty: 'Controlar a profundidade do término cervical no 12 sem invadir o sulco.',
    difficultyTopics: ['Término cervical', 'Preparo'],
    ease: 'O mock-up ajudou muito a conversar com a paciente e a guiar o preparo.',
    differently: 'Faria a guia de silicone antes do mock-up para checar a espessura durante o preparo.',
    performed: [
      { date: '2027-08-12', procedure: 'Planejamento e escaneamento', quantity: 1, unit: 'caso' },
      { date: '2027-08-26', procedure: 'Mock-up', quantity: 1, unit: 'caso' },
      { date: '2028-03-02', procedure: 'Preparo para laminado cerâmico', quantity: 4, unit: 'peças', teeth: '12, 11, 21, 22' },
    ],
    sessions: [
      {
        number: 1,
        title: 'Planejamento',
        date: '2027-08-12',
        tasks: ['Escaneamento intraoral', 'Fotografias (protocolo completo)', 'Planejamento inicial no Smile Cloud'],
        notes: 'Paciente quer fechar diastemas sem aumentar muito o comprimento.',
        status: 'realizada',
      },
      {
        number: 2,
        title: 'Mock-up',
        date: '2027-08-26',
        tasks: ['Prova do mock-up', 'Fotos e vídeo com a paciente', 'Aprovação do formato'],
        notes: 'Ajustar o comprimento do 22 em 0,5 mm.',
        status: 'realizada',
      },
      {
        number: 3,
        title: 'Preparo e moldagem',
        date: '2028-03-02',
        tasks: ['Preparo guiado pelo mock-up', 'Escaneamento dos preparos', 'Provisórios'],
        notes: 'Término cervical do 12 exigiu afastamento com fio.',
        status: 'realizada',
      },
      {
        number: 4,
        title: 'Cimentação',
        date: '2028-03-14',
        tasks: ['Prova seca e com pasta try-in', 'Cimentação adesiva sob isolamento', 'Ajuste oclusal e polimento'],
        status: 'planejada',
      },
      {
        number: 5,
        title: 'Controle',
        date: '2028-04-11',
        tasks: ['Fotos finais', 'Avaliação gengival'],
        status: 'planejada',
      },
    ],
  },
  {
    id: 'rf-onlays',
    patient: 'R.F.',
    procedure: 'Onlays',
    teeth: '36, 37',
    startDate: '2027-08-05',
    module: 15,
    supervisor: 'Prof. Bruno Saldanha',
    status: 'concluido',
    summary: 'Dois onlays em resina composta indireta após remoção de amálgamas extensos.',
    difficulty: 'Isolamento na distal do 37 e controle da umidade.',
    difficultyTopics: ['Isolamento'],
    ease: 'Cimentação sem intercorrências.',
    performed: [
      { date: '2027-08-05', procedure: 'Preparo para onlay', quantity: 2, unit: 'peças', teeth: '36, 37' },
      { date: '2027-08-19', procedure: 'Cimentação de onlay', quantity: 2, unit: 'peças', teeth: '36, 37' },
    ],
    sessions: [
      { number: 1, title: 'Preparo', date: '2027-08-05', tasks: ['Remoção das restaurações', 'Preparo e escaneamento', 'Provisórios'], status: 'realizada' },
      { number: 2, title: 'Cimentação', date: '2027-08-19', tasks: ['Cimentação adesiva', 'Ajuste oclusal'], status: 'realizada' },
    ],
  },
  {
    id: 'ls-faceta-resina',
    patient: 'L.S.',
    procedure: 'Faceta em resina',
    teeth: '11',
    startDate: '2027-07-28',
    module: 4,
    supervisor: 'Profa. Carolina Duarte',
    status: 'concluido',
    summary: 'Faceta direta em resina para correção de forma e cor após fratura.',
    difficulty: 'Escolher a opacidade da dentina para mascarar o escurecimento leve.',
    difficultyTopics: ['Cor', 'Substrato escurecido'],
    ease: 'Estratificação do esmalte e acabamento.',
    performed: [{ date: '2027-07-28', procedure: 'Faceta direta em resina', quantity: 1, unit: 'dente', teeth: '11' }],
    sessions: [{ number: 1, title: 'Faceta direta', date: '2027-07-28', tasks: ['Seleção de cor', 'Estratificação', 'Acabamento'], status: 'realizada' }],
  },
  {
    id: 'brs-laminados',
    patient: 'B.R.S.',
    procedure: 'Laminados cerâmicos',
    teeth: '13 a 23',
    startDate: '2028-02-10',
    module: 14,
    supervisor: 'Prof. Rafael Mendes',
    status: 'andamento',
    summary: 'Seis laminados para alteração de forma e cor.',
    difficulty: 'Tive dificuldade com o término cervical nos caninos.',
    difficultyTopics: ['Término cervical'],
    ease: 'Comunicação com o laboratório.',
    performed: [{ date: '2028-03-02', procedure: 'Preparo para laminado cerâmico', quantity: 4, unit: 'peças', teeth: '12, 11, 21, 22' }],
    sessions: [
      { number: 1, title: 'Planejamento', date: '2028-02-10', tasks: ['Fotos', 'Escaneamento'], status: 'realizada' },
      { number: 2, title: 'Preparo dos incisivos', date: '2028-03-02', tasks: ['Preparo de 12 a 22', 'Provisórios'], status: 'realizada' },
      { number: 3, title: 'Preparo dos caninos', date: '2028-03-18', tasks: ['Preparo de 13 e 23', 'Escaneamento'], status: 'planejada' },
    ],
  },
  {
    id: 'jpc-resina-posterior',
    patient: 'J.P.C.',
    procedure: 'Resina posterior',
    teeth: '36, 37',
    startDate: '2028-02-24',
    module: 5,
    supervisor: 'Prof. Marcos Teixeira',
    status: 'concluido',
    summary: 'Restaurações classe II em resina composta.',
    difficulty: 'Ponto de contato no 37.',
    difficultyTopics: ['Restauração direta'],
    ease: 'Isolamento absoluto.',
    performed: [{ date: '2028-02-24', procedure: 'Resina composta posterior', quantity: 2, unit: 'dentes', teeth: '36, 37' }],
    sessions: [{ number: 1, title: 'Restaurações', date: '2028-02-24', tasks: ['Isolamento', 'Restauração classe II', 'Ajuste oclusal'], status: 'realizada' }],
  },
]

export function caseById(id: string) {
  return cases.find((c) => c.id === id) ?? null
}

/** Ordenados do mais recente para o mais antigo (pela última consulta). */
export function sortedCases() {
  const last = (c: DemoCase) => c.sessions.map((s) => s.date).sort().at(-1) ?? c.startDate
  return [...cases].sort((a, b) => last(b).localeCompare(last(a)))
}

export function nextSession(c: DemoCase) {
  return c.sessions.find((s) => s.status === 'planejada') ?? null
}
