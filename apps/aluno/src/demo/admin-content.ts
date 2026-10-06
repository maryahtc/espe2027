/** Estados FICTÍCIOS dos conteúdos institucionais no painel admin (prévia). */
import type { Lifecycle } from '@portal/ui/tag'
import { modules } from './data'
import { type LibraryItem, library } from './library'

export type AdminModuleRow = { slug: string; number: string; title: string; dates: string; status: Lifecycle; note: string; href: string }

export const adminModules: AdminModuleRow[] = [
  ...modules.map((m) => ({
    slug: m.slug,
    number: m.slug,
    title: m.title,
    dates: m.start,
    status: 'publicado' as const,
    note: m.number <= 14 ? 'Programação e preparação' : m.number <= 16 ? 'Programação publicada' : 'Só datas',
    href: `/admin/modulos/${m.slug}`,
  })),
  {
    slug: 'extra-reabilitacao',
    number: '—',
    title: 'Módulo extra: reabilitação oral avançada',
    dates: '2029-09-13',
    status: 'rascunho',
    note: 'Em montagem',
    href: '/admin/modulos/novo',
  },
  {
    slug: 'workshop-fotografia',
    number: '—',
    title: 'Workshop de fotografia (cancelado)',
    dates: '2027-06-05',
    status: 'arquivado',
    note: 'Arquivado em 12/05/2027',
    href: '/admin/modulos',
  },
]

export type AdminContent = LibraryItem & { status: Lifecycle }

export const draftContents: AdminContent[] = [
  {
    slug: 'ajuste-oclusal-em-laminados',
    title: 'Ajuste oclusal em laminados',
    teacher: 'Prof. Marcos Teixeira',
    category: 'Oclusão',
    topics: ['Oclusão', 'Laminados'],
    minutes: 26,
    kind: 'Videoaula',
    description: 'Checagem de contatos e guias depois da cimentação, sem comprometer a cerâmica.',
    modules: [14],
    status: 'rascunho',
  },
  {
    slug: 'guia-de-selecao-de-cimentos',
    title: 'Guia de seleção de cimentos resinosos',
    teacher: 'Prof. Bruno Saldanha',
    category: 'Materiais',
    topics: ['Cimentação'],
    minutes: 8,
    kind: 'PDF',
    description: 'Tabela comparativa: dual, fotoativado e resina pré-aquecida, por situação clínica.',
    modules: [13, 14],
    status: 'rascunho',
  },
  {
    slug: 'protocolo-antigo-clareamento',
    title: 'Protocolo de clareamento (versão 2026)',
    teacher: 'Profa. Helena Prado',
    category: 'Dentística',
    topics: ['Clareamento'],
    minutes: 6,
    kind: 'PDF',
    description: 'Versão anterior do protocolo, substituída pela revisão de 2027.',
    modules: [7],
    status: 'arquivado',
  },
]

export const adminContents: AdminContent[] = [...draftContents, ...library.map((l) => ({ ...l, status: 'publicado' as const }))]

export type AdminNotice = { id: string; title: string; body: string; from: string; showFrom: string; showUntil: string; status: Lifecycle }

export const adminNotices: AdminNotice[] = [
  {
    id: 'clinica-sabado',
    title: 'Clínica de sábado começa às 7h30',
    body: 'Chegue com o kit de isolamento absoluto completo. Pacientes do Módulo 14 já confirmados.',
    from: 'Coordenação clínica',
    showFrom: '09/03',
    showUntil: '18/03',
    status: 'publicado',
  },
  {
    id: 'sala-modulo-15',
    title: 'Módulo 15 em nova sala',
    body: 'As aulas teóricas do Módulo 15 serão no auditório 2, no térreo.',
    from: 'Coordenação',
    showFrom: '01/04',
    showUntil: '13/04',
    status: 'rascunho',
  },
  {
    id: 'inscricao-clinica-extra',
    title: 'Inscrições abertas para a clínica extra de fevereiro',
    body: 'Inscreva-se com a coordenação até 20/02.',
    from: 'Coordenação clínica',
    showFrom: '05/02',
    showUntil: '20/02',
    status: 'arquivado',
  },
]

export function countBy<T extends { status: Lifecycle }>(items: T[]) {
  return {
    rascunho: items.filter((i) => i.status === 'rascunho').length,
    publicado: items.filter((i) => i.status === 'publicado').length,
    arquivado: items.filter((i) => i.status === 'arquivado').length,
  }
}
