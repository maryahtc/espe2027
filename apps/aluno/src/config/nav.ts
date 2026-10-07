/**
 * Navegação do Portal do Aluno — 5 áreas principais (barra inferior no celular, lateral no desktop)
 * + Perfil. A ordem segue o ciclo da especialização: saber o que vem → aprender → pensar → fazer.
 */
export type NavIcon = 'home' | 'calendar' | 'book' | 'branch' | 'tooth' | 'user'

export type NavArea = {
  key: string
  label: string
  href: string
  icon: NavIcon
  /** Prefixos de rota que acendem esta área. */
  match: string[]
  children?: Array<{ label: string; href: string; match: string[] }>
}

export const studentNav: NavArea[] = [
  { key: 'inicio', label: 'Início', href: '/', icon: 'home', match: ['/'] },
  {
    key: 'especializacao',
    label: 'Especialização',
    href: '/cronograma',
    icon: 'calendar',
    match: ['/cronograma', '/modulos'],
    children: [
      { label: 'Cronograma', href: '/cronograma', match: ['/cronograma'] },
      { label: 'Módulos', href: '/modulos', match: ['/modulos'] },
    ],
  },
  {
    key: 'aprender',
    label: 'Aprender',
    href: '/biblioteca',
    icon: 'book',
    match: ['/biblioteca'],
    children: [{ label: 'Biblioteca', href: '/biblioteca', match: ['/biblioteca'] }],
  },
  {
    key: 'pensar',
    label: 'Pensar',
    href: '/workflows',
    icon: 'branch',
    match: ['/workflows'],
    children: [{ label: 'Workflow clínico', href: '/workflows', match: ['/workflows'] }],
  },
  {
    key: 'clinica',
    label: 'Clínica',
    href: '/casos',
    icon: 'tooth',
    match: ['/casos', '/producao'],
    children: [
      { label: 'Meus casos', href: '/casos', match: ['/casos'] },
      { label: 'Minha produção', href: '/producao', match: ['/producao'] },
    ],
  },
]

export const profileNav = { label: 'Perfil', href: '/perfil', match: ['/perfil'] }

export function isActive(pathname: string, match: string[]): boolean {
  return match.some((m) => (m === '/' ? pathname === '/' : pathname === m || pathname.startsWith(`${m}/`)))
}

/* ── Painel administrativo ─────────────────────────────────────────────── */

export type AdminIcon = 'home' | 'users' | 'layers' | 'calendar' | 'megaphone' | 'book' | 'tag' | 'tooth' | 'branch' | 'chart'

export type AdminSection = {
  slug: string
  label: string
  /** O que se cadastra aqui, em linguagem do dia a dia. */
  summary: string
  icon: AdminIcon
  /** Ação principal da seção. */
  action?: string
  /** Etapa do plano em que a seção passa a funcionar. */
  stage: string
  details: string[]
}

export const adminGroups: Array<{ label: string; sections: AdminSection[] }> = [
  {
    label: 'Turmas e pessoas',
    sections: [
      {
        slug: 'turmas',
        label: 'Turmas',
        summary: 'Turma 2027, 2028… datas e status',
        icon: 'layers',
        action: 'Nova turma',
        stage: 'Etapa 2',
        details: ['Nome, início e fim da turma', 'Copiar módulos de outra turma', 'Encerrar turma ao fim dos 30 meses'],
      },
      {
        slug: 'alunos',
        label: 'Alunos',
        summary: 'Convites, matrículas e acesso',
        icon: 'users',
        action: 'Convidar aluno',
        stage: 'Etapa 2',
        details: ['Convidar por e-mail (um a um ou colando uma lista)', 'Escolher a turma', 'Reenviar convite, desativar acesso'],
      },
      {
        slug: 'equipe',
        label: 'Docentes e coordenação',
        summary: 'Quem dá aula e quem acompanha a turma',
        icon: 'users',
        action: 'Novo docente',
        stage: 'Etapas 2 e 3',
        details: [
          'Docente: nome, especialidade e foto — aparece no cronograma e nas aulas, sem precisar de login',
          'Coordenação: usuário com acesso a casos e produção da turma',
        ],
      },
    ],
  },
  {
    label: 'Especialização',
    sections: [
      {
        slug: 'modulos',
        label: 'Módulos e cronograma',
        summary: 'Módulos, programação por dia e preparação',
        icon: 'calendar',
        action: 'Novo módulo',
        stage: 'Etapa 3',
        details: [],
      },
      {
        slug: 'avisos',
        label: 'Avisos',
        summary: 'Recados para a turma, com período de exibição',
        icon: 'megaphone',
        action: 'Novo aviso',
        stage: 'Etapa 5',
        details: ['Texto curto e turma', 'Mostrar de/até', 'Aparece no Início do aluno'],
      },
    ],
  },
  {
    label: 'Biblioteca',
    sections: [
      {
        slug: 'conteudos',
        label: 'Aulas e conteúdos',
        summary: 'Videoaulas, artigos, livros, PDFs e links',
        icon: 'book',
        action: 'Nova aula ou conteúdo',
        stage: 'Etapa 4',
        details: [
          'Upload do vídeo direto para o Bunny Stream',
          'Docente, descrição, categoria, temas e procedimentos relacionados',
          'Materiais anexos e vínculo com módulos (antes / durante / depois)',
        ],
      },
      {
        slug: 'temas',
        label: 'Temas',
        summary: 'O vocabulário que liga aulas, workflows e dificuldades',
        icon: 'tag',
        action: 'Novo tema',
        stage: 'Etapa 4',
        details: ['Nome, descrição e sinônimos', 'Usado nas recomendações e no painel da coordenação'],
      },
    ],
  },
  {
    label: 'Clínica',
    sections: [
      {
        slug: 'procedimentos',
        label: 'Procedimentos',
        summary: 'Lista, categorias e unidade de contagem',
        icon: 'tooth',
        action: 'Novo procedimento',
        stage: 'Etapa 6',
        details: [
          'Nome, categoria e sinônimos ("faceta cerâmica" → Laminado cerâmico)',
          'Unidade de contagem: dente, peça, arcada ou caso',
          'A lista inicial será definida com a coordenação clínica',
        ],
      },
      {
        slug: 'workflows',
        label: 'Workflows clínicos',
        summary: 'Árvores de raciocínio: perguntas, caminhos e conteúdos',
        icon: 'branch',
        action: 'Novo workflow',
        stage: 'Etapa 10',
        details: [
          'Editor por blocos: pergunta, orientação, decisão, alerta, conteúdo, resultado, referência',
          'Mapa automático da árvore e "ver como aluno"',
          'Rascunho, publicado ou arquivado',
        ],
      },
    ],
  },
  {
    label: 'Acompanhamento',
    sections: [
      {
        slug: 'producao',
        label: 'Produção da turma',
        summary: 'Procedimentos, lacunas e dificuldades',
        icon: 'chart',
        stage: 'Etapa 11',
        details: ['Totais e distribuição por procedimento', 'Alunos com pouca exposição', 'Dificuldades mais relatadas por tema'],
      },
    ],
  },
]

export const adminSections = adminGroups.flatMap((g) => g.sections)
