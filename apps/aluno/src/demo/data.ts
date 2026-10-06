/**
 * DADOS FICTÍCIOS da Etapa 1 — servem só para validar a experiência visual.
 * Pessoas, aulas, casos e números são inventados. Nada aqui vem do banco.
 *
 * Situação: aluna no meio da especialização (mês 14 de 30), a 5 dias do Módulo 14,
 * com 2 conteúdos obrigatórios pendentes, um aviso da clínica e uma recomendação.
 */
import type { Requirement } from '@portal/ui/tag'
import { addDays, type CivilDate, nthWeekdayOfMonth } from '@/lib/dates'

export const DEMO_TODAY: CivilDate = '2028-03-11'

export const student = {
  name: 'Ana Beatriz Lima',
  firstName: 'Ana',
  initials: 'AL',
  cohort: 'Turma 2027',
  monthOfCourse: 14,
  totalMonths: 30,
}

export type Teacher = { slug: string; name: string; short: string }

export const teachers: Teacher[] = [
  { slug: 'rafael-mendes', name: 'Prof. Rafael Mendes', short: 'Rafael Mendes' },
  { slug: 'carolina-duarte', name: 'Profa. Carolina Duarte', short: 'Carolina Duarte' },
  { slug: 'bruno-saldanha', name: 'Prof. Bruno Saldanha', short: 'Bruno Saldanha' },
  { slug: 'helena-prado', name: 'Profa. Helena Prado', short: 'Helena Prado' },
  { slug: 'marcos-teixeira', name: 'Prof. Marcos Teixeira', short: 'Marcos Teixeira' },
]

const T = Object.fromEntries(teachers.map((t) => [t.slug, t])) as Record<string, Teacher>

const TITLES: Array<[string, string[]]> = [
  ['Fundamentos e documentação fotográfica', ['helena-prado', 'rafael-mendes']],
  ['Planejamento estético e análise facial', ['rafael-mendes', 'carolina-duarte']],
  ['Isolamento absoluto e adesão', ['bruno-saldanha']],
  ['Resinas compostas anteriores', ['carolina-duarte', 'bruno-saldanha']],
  ['Resinas compostas posteriores', ['bruno-saldanha', 'marcos-teixeira']],
  ['Oclusão aplicada à reabilitação', ['marcos-teixeira']],
  ['Clareamento dental', ['helena-prado']],
  ['Periodontia estética', ['helena-prado', 'marcos-teixeira']],
  ['Fluxo digital: escaneamento e planejamento', ['rafael-mendes']],
  ['Mock-up e enceramento diagnóstico', ['rafael-mendes', 'carolina-duarte']],
  ['Preparos para restaurações indiretas', ['bruno-saldanha', 'rafael-mendes']],
  ['Cerâmicas: seleção de materiais', ['carolina-duarte']],
  ['Cimentação adesiva', ['bruno-saldanha', 'carolina-duarte']],
  ['Laminados cerâmicos', ['rafael-mendes', 'carolina-duarte', 'bruno-saldanha']],
  ['Onlays e overlays', ['bruno-saldanha', 'marcos-teixeira']],
  ['Coroas totais', ['marcos-teixeira', 'rafael-mendes']],
  ['Dentes desgastados', ['marcos-teixeira', 'helena-prado']],
  ['Substratos escurecidos', ['carolina-duarte', 'rafael-mendes']],
  ['Provisórios e transição', ['bruno-saldanha']],
  ['Abordagem multidisciplinar', ['helena-prado', 'marcos-teixeira']],
  ['Implantes na zona estética', ['helena-prado']],
  ['Fotografia clínica avançada', ['helena-prado', 'rafael-mendes']],
  ['Ajuste oclusal e placas', ['marcos-teixeira']],
  ['Casos complexos I', ['rafael-mendes', 'marcos-teixeira']],
  ['Fluxo digital avançado', ['rafael-mendes', 'carolina-duarte']],
  ['Manutenção e longevidade', ['bruno-saldanha', 'helena-prado']],
  ['Casos complexos II', ['carolina-duarte', 'marcos-teixeira']],
  ['Comunicação e gestão do caso', ['helena-prado']],
  ['Seminários de casos clínicos', ['rafael-mendes', 'carolina-duarte', 'bruno-saldanha']],
  ['Apresentação final', ['rafael-mendes', 'carolina-duarte', 'bruno-saldanha', 'helena-prado']],
]

export type ModuleState = 'done' | 'next' | 'upcoming'

export type DemoModule = {
  number: number
  slug: string
  title: string
  start: CivilDate
  end: CivilDate
  teachers: Teacher[]
  state: ModuleState
}

/** 30 módulos mensais, de fevereiro/2027 a julho/2029, de quinta a sábado na 3ª semana. */
export const modules: DemoModule[] = TITLES.map(([title, slugs], i) => {
  const monthIndex = 1 + i // fevereiro/2027 = índice 1
  const y = 2027 + Math.floor(monthIndex / 12)
  const m = (monthIndex % 12) + 1
  const start = nthWeekdayOfMonth(y, m, 4, 3)
  const end = addDays(start, 2)
  const number = i + 1
  return {
    number,
    slug: String(number).padStart(2, '0'),
    title,
    start,
    end,
    teachers: slugs.map((s) => T[s]!),
    state: end < DEMO_TODAY ? 'done' : 'upcoming',
  }
})
const nextIdx = modules.findIndex((m) => m.end >= DEMO_TODAY)
if (nextIdx >= 0) modules[nextIdx]!.state = 'next'

export const nextModule = modules[nextIdx]!
export const previousModule = modules[nextIdx - 1] ?? null
export const followingModule = modules[nextIdx + 1] ?? null

export function moduleBySlug(slug: string) {
  return modules.find((m) => m.slug === slug || String(m.number) === slug) ?? null
}

/* ── Detalhe do Módulo 14 ───────────────────────────────────────────────── */

export const nextModuleDetail = {
  description:
    'Do planejamento à cimentação: indicação, seleção do material, preparo guiado pelo mock-up, ' +
    'moldagem/escaneamento e protocolo de cimentação. Clínica no sábado com casos da turma.',
  place: 'Sede Conexo · auditório e clínica',
}

export type ActivityType = 'Teórica' | 'Demonstração' | 'Hands-on' | 'Clínica' | 'Discussão de caso'

export type ScheduleItem = { start: string; end: string; title: string; teacher: Teacher; type: ActivityType }

export const nextModuleSchedule: Array<{ date: CivilDate; items: ScheduleItem[] }> = [
  {
    date: nextModule.start,
    items: [
      { start: '08:30', end: '10:30', title: 'Indicações e limites dos laminados cerâmicos', teacher: T['rafael-mendes']!, type: 'Teórica' },
      { start: '10:45', end: '12:30', title: 'Seleção de material: dissilicato, feldspática e híbridas', teacher: T['carolina-duarte']!, type: 'Teórica' },
      { start: '14:00', end: '18:00', title: 'Mock-up como guia de preparo', teacher: T['rafael-mendes']!, type: 'Demonstração' },
    ],
  },
  {
    date: addDays(nextModule.start, 1),
    items: [
      { start: '08:30', end: '12:30', title: 'Preparos minimamente invasivos em manequim', teacher: T['bruno-saldanha']!, type: 'Hands-on' },
      { start: '14:00', end: '16:00', title: 'Moldagem, escaneamento e comunicação com o laboratório', teacher: T['carolina-duarte']!, type: 'Teórica' },
      { start: '16:15', end: '18:00', title: 'Discussão dos casos que serão atendidos no sábado', teacher: T['rafael-mendes']!, type: 'Discussão de caso' },
    ],
  },
  {
    date: nextModule.end,
    items: [
      { start: '07:30', end: '13:00', title: 'Clínica: preparo e provisórios', teacher: T['bruno-saldanha']!, type: 'Clínica' },
      { start: '14:00', end: '17:00', title: 'Clínica: cimentação dos casos da turma anterior', teacher: T['carolina-duarte']!, type: 'Clínica' },
    ],
  },
]

export type ContentKind = 'video' | 'artigo' | 'pdf' | 'capitulo'

export type PrepItem = {
  id: string
  /** Conteúdo da biblioteca. */
  slug: string
  kind: ContentKind
  title: string
  author: string
  minutes: number
  requirement: Requirement
  status: 'concluido' | 'em-andamento' | 'pendente'
  progress?: number
}

export const preparation: PrepItem[] = [
  {
    id: 'p1',
    slug: 'preparos-minimamente-invasivos',
    kind: 'video',
    title: 'Preparos minimamente invasivos para laminados',
    author: 'Prof. Rafael Mendes',
    minutes: 32,
    requirement: 'obrigatorio',
    status: 'concluido',
  },
  {
    id: 'p2',
    slug: 'selecao-de-cor-e-substrato',
    kind: 'video',
    title: 'Seleção de cor e leitura do substrato',
    author: 'Profa. Carolina Duarte',
    minutes: 24,
    requirement: 'obrigatorio',
    status: 'em-andamento',
    progress: 40,
  },
  {
    id: 'p3',
    slug: 'espessura-de-preparo-revisao',
    kind: 'artigo',
    title: 'Espessura de preparo e longevidade de laminados — revisão',
    author: 'Leitura indicada pela coordenação',
    minutes: 25,
    requirement: 'obrigatorio',
    status: 'pendente',
  },
  {
    id: 'p4',
    slug: 'mock-up-do-enceramento-a-boca',
    kind: 'video',
    title: 'Mock-up: do enceramento à boca',
    author: 'Prof. Rafael Mendes',
    minutes: 18,
    requirement: 'recomendado',
    status: 'pendente',
  },
  {
    id: 'p5',
    slug: 'protocolo-de-cimentacao-adesiva',
    kind: 'pdf',
    title: 'Protocolo de cimentação adesiva (checklist de bancada)',
    author: 'Prof. Bruno Saldanha',
    minutes: 5,
    requirement: 'complementar',
    status: 'pendente',
  },
]

/* ── Para você ──────────────────────────────────────────────────────────── */

export const recommendation = {
  title: 'Controle de profundidade no término cervical',
  author: 'Prof. Bruno Saldanha',
  minutes: 18,
  topic: 'Término cervical',
  reason: 'Você relatou dificuldade com o término cervical no caso B.R.S., registrado em 02/03.',
  workflow: { title: 'Abordagem estética anterior', href: '/workflows/abordagem-anterior/forma/acrescimo' },
  more: ['preparos-minimamente-invasivos', 'espessura-de-preparo-revisao'],
}

/* ── Clínica ────────────────────────────────────────────────────────────── */

export const clinicNotice = {
  title: 'Clínica de sábado começa às 7h30',
  body: 'Chegue com o kit de isolamento absoluto completo. Pacientes do Módulo 14 já confirmados.',
  from: 'Coordenação clínica',
  date: '2028-03-09' as CivilDate,
}

export const productionSnapshot = { procedures: 31, cases: 12, categories: 7 }

/* ── Programação genérica dos demais módulos (prévia) ───────────────────── */

export function scheduleFor(m: DemoModule): Array<{ date: CivilDate; items: ScheduleItem[] }> {
  if (m.number === nextModule.number) return nextModuleSchedule
  const [a, b] = [m.teachers[0]!, m.teachers[1] ?? m.teachers[0]!]
  return [
    {
      date: m.start,
      items: [
        { start: '08:30', end: '12:30', title: `${m.title}: fundamentos e indicações`, teacher: a, type: 'Teórica' },
        { start: '14:00', end: '18:00', title: 'Demonstração clínica comentada', teacher: b, type: 'Demonstração' },
      ],
    },
    {
      date: addDays(m.start, 1),
      items: [
        { start: '08:30', end: '12:30', title: 'Hands-on em manequim', teacher: b, type: 'Hands-on' },
        { start: '14:00', end: '18:00', title: 'Planejamento dos casos da clínica', teacher: a, type: 'Discussão de caso' },
      ],
    },
    {
      date: m.end,
      items: [{ start: '07:30', end: '13:00', title: 'Clínica supervisionada', teacher: a, type: 'Clínica' }],
    },
  ]
}

/* ── Materiais necessários (no futuro: cadastro do admin por módulo) ────── */

export type MaterialGroup = { title: string; items: string[] }

const BASE_MATERIALS: MaterialGroup[] = [
  { title: 'Clínica', items: ['Kit de isolamento absoluto (dique, grampos, arco, perfurador)', 'Jaleco, gorro, máscara e óculos'] },
  { title: 'Estudo', items: ['Notebook ou tablet', 'Caderno de anotações'] },
]

const MODULE_MATERIALS: Record<number, { groups: MaterialGroup[]; notes: string[] }> = {
  14: {
    groups: [
      {
        title: 'Hands-on de preparo (sexta)',
        items: [
          'Kit de pontas diamantadas para laminados',
          'Pontas de profundidade (0,3 e 0,5 mm)',
          'Guias de silicone do mock-up',
          'Instrumentais para acabamento de preparo',
        ],
      },
      {
        title: 'Clínica (sábado)',
        items: ['Kit de isolamento absoluto completo', 'Fio afastador #000 e #00', 'Espátulas de resina', 'Fotopolimerizador'],
      },
      { title: 'Estudo', items: ['Notebook com acesso ao Smile Cloud', 'Fotos dos seus casos de laminado'] },
    ],
    notes: [
      'Trazer os modelos impressos com os dentes preparados para o hands-on.',
      'O fotopolimerizador deve estar com a bateria carregada; a clínica não empresta aparelhos.',
    ],
  },
}

export function materialsFor(m: DemoModule) {
  return MODULE_MATERIALS[m.number] ?? {
    groups: [
      { title: 'Hands-on', items: ['Manequim e dentes de estoque', 'Instrumentais de acabamento e polimento', 'Espátulas de resina'] },
      ...BASE_MATERIALS,
    ],
    notes: ['A lista final é confirmada pela coordenação uma semana antes do módulo.'],
  }
}

/* ── Outros eventos acadêmicos no calendário ────────────────────────────── */

export type AcademicEvent = { date: CivilDate; title: string; kind: 'online' | 'clinica' | 'prazo'; time?: string }

export const academicEvents: AcademicEvent[] = [
  { date: '2028-03-01', title: 'Discussão de casos online', kind: 'online', time: '19:30' },
  { date: '2028-03-25', title: 'Clínica extra', kind: 'clinica', time: '08:00' },
  { date: '2028-03-29', title: 'Entrega: planejamento do caso de laminados', kind: 'prazo' },
  { date: '2028-04-05', title: 'Discussão de casos online', kind: 'online', time: '19:30' },
  { date: '2028-02-02', title: 'Discussão de casos online', kind: 'online', time: '19:30' },
  { date: '2028-02-26', title: 'Clínica extra', kind: 'clinica', time: '08:00' },
  { date: '2027-02-27', title: 'Aula inaugural online', kind: 'online', time: '19:00' },
]

export const COURSE_FIRST_MONTH = '2027-02'
export const COURSE_LAST_MONTH = '2029-07'
