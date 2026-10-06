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
    kind: 'video',
    title: 'Preparos minimamente invasivos para laminados',
    author: 'Prof. Rafael Mendes',
    minutes: 32,
    requirement: 'obrigatorio',
    status: 'concluido',
  },
  {
    id: 'p2',
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
    kind: 'artigo',
    title: 'Espessura de preparo e longevidade de laminados — revisão',
    author: 'Leitura indicada pela coordenação',
    minutes: 25,
    requirement: 'obrigatorio',
    status: 'pendente',
  },
  {
    id: 'p4',
    kind: 'video',
    title: 'Mock-up: do enceramento à boca',
    author: 'Prof. Rafael Mendes',
    minutes: 18,
    requirement: 'recomendado',
    status: 'pendente',
  },
  {
    id: 'p5',
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
  workflow: { title: 'Laminados: definição do término', href: '/workflows' },
  more: [
    { title: 'Acabamento cervical com pontas multilaminadas', author: 'Prof. Bruno Saldanha', minutes: 12 },
    { title: 'Afastamento gengival para preparo e moldagem', author: 'Profa. Helena Prado', minutes: 21 },
  ],
}

/* ── Clínica ────────────────────────────────────────────────────────────── */

export const clinicNotice = {
  title: 'Clínica de sábado começa às 7h30',
  body: 'Chegue com o kit de isolamento absoluto completo. Pacientes do Módulo 14 já confirmados.',
  from: 'Coordenação clínica',
  date: '2028-03-09' as CivilDate,
}

export const nextAppointment = {
  patient: 'M.A.S.',
  session: 'Consulta 03 de 04',
  title: 'Cimentação dos laminados 12 a 22',
  date: '2028-03-14' as CivilDate,
}

export const recentCases = [
  { patient: 'B.R.S.', date: '2028-03-02' as CivilDate, what: 'Preparo para laminados · 4 peças' },
  { patient: 'J.P.C.', date: '2028-02-24' as CivilDate, what: 'Resina posterior · dentes 36 e 37' },
]

export const productionSnapshot = { procedures: 31, cases: 12, categories: 7 }
