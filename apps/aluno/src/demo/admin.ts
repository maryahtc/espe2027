/** Números e pendências FICTÍCIOS do painel admin (Etapa 1). */
export const adminOverview = {
  cohort: 'Turma 2027',
  students: 18,
  invitesPending: 2,
  contents: 142,
  workflowsPublished: 3,
  workflowsDraft: 1,
  procedures: 0,
}

export type Shortcut = { slug: string; verb: string; noun: string; where: string; status: string; icon: 'layers' | 'users' | 'calendar' | 'book' | 'branch' | 'tooth' }

/** As seis coisas que mais se cadastra, na ordem em que a especialização é montada. */
export const shortcuts: Shortcut[] = [
  { slug: 'turmas', verb: 'Nova', noun: 'turma', where: 'Turmas', status: '1 turma ativa', icon: 'layers' },
  { slug: 'alunos', verb: 'Convidar', noun: 'aluno', where: 'Alunos', status: '18 alunos · 2 convites pendentes', icon: 'users' },
  { slug: 'modulos', verb: 'Novo', noun: 'módulo', where: 'Módulos e cronograma', status: '30 módulos · 2 em rascunho', icon: 'calendar' },
  { slug: 'conteudos', verb: 'Nova', noun: 'aula ou conteúdo', where: 'Biblioteca', status: '142 conteúdos', icon: 'book' },
  { slug: 'workflows', verb: 'Novo', noun: 'workflow', where: 'Workflows clínicos', status: '3 publicados · 1 rascunho', icon: 'branch' },
  { slug: 'procedimentos', verb: 'Novo', noun: 'procedimento', where: 'Procedimentos', status: 'Lista a definir com a coordenação clínica', icon: 'tooth' },
]

export const attention = [
  { text: 'Módulo 15 · Onlays e overlays ainda não tem conteúdo obrigatório', href: '/admin/modulos', when: 'módulo em 5 semanas' },
  { text: 'Workflow "Alteração estética anterior" está em rascunho, com uma etapa solta', href: '/admin/workflows/novo', when: 'editado hoje' },
  { text: '3 aulas sem tema — não aparecem nas recomendações', href: '/admin/conteudos', when: '' },
  { text: '2 convites de alunos ainda não aceitos', href: '/admin/alunos', when: 'enviados há 4 dias' },
]
