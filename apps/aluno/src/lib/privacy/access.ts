/**
 * Etapa 10 — quem vê o quê, conforme as regras REAIS do banco (RLS e funções). Fonte única do texto "Quem vê o quê"
 * do Perfil (Parte 3). Cada afirmação aponta o teste de banco que a verifica (`packages/db/tests/*.sql`). Se uma regra
 * do banco mudar, este arquivo e esses testes mudam juntos.
 * Não existe configuração de privacidade para o aluno escolher: as regras valem para todos e são garantidas pelo
 * banco. Por isso o Perfil não mostra nenhuma opção "ligar/desligar".
 */
export type AccessRule = { who: string; what: string; verifiedBy: string }

/** Leitura dos casos (Etapa 6), detalhada por pessoa. */
export const CASE_ACCESS: AccessRule[] = [
  { who: 'Você', what: 'vê todos os seus casos, registros e a sua produção', verifiedBy: 'Privacidade: o próprio aluno lê o caso' },
  { who: 'Colegas', what: 'nunca veem seus casos, registros, pacientes, dificuldades ou números', verifiedBy: 'Privacidade: colega da turma NÃO lê o caso' },
  { who: 'Coordenação da sua turma', what: 'lê seus casos e a sua produção (só leitura)', verifiedBy: 'Privacidade: coordenação da turma lê o caso' },
  { who: 'Coordenação de outras turmas', what: 'não vê nada seu', verifiedBy: 'Privacidade: coordenação de outra turma NÃO lê o caso' },
  { who: 'Admin da especialização', what: 'lê seus casos e a sua produção (só leitura)', verifiedBy: 'Privacidade: Admin lê o caso' },
  {
    who: 'Outra pessoa (ex.: professor supervisor)',
    what: 'só com autorização explícita registrada pelo Admin para um caso, enquanto vigente',
    verifiedBy: 'Privacidade: acesso excepcional só com autorização do Admin, enquanto vigente',
  },
]

/** Quem vê: "sim", "não", ou uma frase curta com a condição. */
export type Seen = { yes: boolean; note?: string }
export type VisibilityRow = {
  id: string
  what: string
  detail?: string
  you: Seen
  colleagues: Seen
  coordination: Seen
  admin: Seen
  verifiedBy: string[]
}

const yes = (note?: string): Seen => ({ yes: true, note })
const no = (note?: string): Seen => ({ yes: false, note })

export const VISIBILITY: VisibilityRow[] = [
  {
    id: 'casos',
    what: 'Casos clínicos',
    detail: 'Iniciais ou código do paciente, registros, foto de capa, link do Smile Cloud, planejamento, reflexão e dificuldades.',
    you: yes(),
    colleagues: no(),
    coordination: yes('da sua turma, só leitura, cada abertura registrada'),
    admin: yes('só leitura, cada abertura registrada'),
    verifiedBy: [
      'rls_auditoria_producao: Privacidade: o próprio aluno lê o caso',
      'rls_auditoria_producao: Privacidade: colega da turma NÃO lê o caso',
      'rls_auditoria_producao: Privacidade: coordenação da turma lê o caso',
      'rls_auditoria_producao: Privacidade: coordenação de outra turma NÃO lê o caso',
      'rls_auditoria_producao: Privacidade: Admin lê o caso',
      'rls_casos: Colega da mesma turma não vê casos, registros nem temas de outro aluno',
      'rls_casos: Abertura pela coordenação vai para a auditoria; a do próprio aluno não; colega não abre',
    ],
  },
  {
    id: 'producao',
    what: 'Minha produção',
    detail: 'Seus números individuais e, somados aos dos colegas, os números da turma.',
    you: yes(),
    colleagues: no('nem os números da turma'),
    coordination: yes('da sua turma; a página individual registra cada abertura'),
    admin: yes('a página individual registra cada abertura'),
    verifiedBy: [
      'rls_auditoria_producao: Auditoria: quem acessou, qual aluno, turma e horário',
      'rls_auditoria_producao: Coordenação não abre aluno de outra turma (sem registro de auditoria)',
      'rls_auditoria_producao: Aluno não abre a produção de colega nem usa a função para si (sem registro)',
      'e2e/visao-turma: Aluno não abre Visão da turma, página individual nem Produção da turma (404)',
    ],
  },
  {
    id: 'biblioteca',
    what: 'Progresso na biblioteca',
    detail: 'Quais aulas e conteúdos você concluiu ou está assistindo.',
    you: yes(),
    colleagues: no(),
    coordination: yes('da sua turma'),
    admin: yes(),
    verifiedBy: [
      'rls_biblioteca: Aluno vê só o próprio progresso',
      'rls_biblioteca: Coordenação vê o progresso individual da própria turma, não de outra',
      'rls_biblioteca: Admin vê o progresso de todas as turmas',
      'rls_biblioteca: Acompanhamento: aluno não vê a lista nem o progresso dos colegas',
    ],
  },
  {
    id: 'perfil',
    what: 'Nome e e-mail da conta',
    you: yes(),
    colleagues: no(),
    coordination: yes('da sua turma'),
    admin: yes(),
    verifiedBy: [
      'rls_privacidade_perfil: Perfil: colega da turma não vê o perfil (nome, e-mail) de outro aluno',
      'rls_privacidade_perfil: Perfil: coordenação vê o perfil dos alunos da própria turma, não de outra',
      'rls_privacidade_perfil: Perfil: Admin vê o perfil de todos os alunos',
    ],
  },
  {
    id: 'pessoal',
    what: 'Lista de materiais marcada e avisos marcados com "Entendi"',
    you: yes(),
    colleagues: no(),
    coordination: no(),
    admin: no(),
    verifiedBy: [
      'rls_privacidade_perfil: Materiais: colega não vê a lista marcada de outro aluno',
      'rls_privacidade_perfil: Materiais: coordenação não vê a lista marcada do aluno',
      'rls_privacidade_perfil: Materiais: Admin não vê a lista marcada do aluno',
      'rls_avisos: Cada aluno vê só os próprios "Entendi"',
    ],
  },
]

/** Fatos que acompanham a tabela (cada um verificado no banco ou nos E2E). */
export const PRIVACY_NOTES: Array<{ id: string; text: string; verifiedBy: string[] }> = [
  {
    id: 'auditoria',
    text: 'Toda vez que a coordenação ou o Admin abre um caso seu ou a sua produção individual, o portal registra quem abriu e quando. Esse registro é consultado pela coordenação da sua turma e pelo Admin.',
    verifiedBy: [
      'rls_auditoria_producao: Coordenação lê só a auditoria da própria turma',
      'rls_auditoria_producao: Aluno não lê a auditoria',
      'rls_auditoria_producao: Ninguém grava direto na auditoria (só a função)',
    ],
  },
  {
    id: 'excecao',
    text: 'Outra pessoa (por exemplo, um professor supervisor) só lê um caso seu com autorização registrada pelo Admin para aquele caso, enquanto ela estiver vigente.',
    verifiedBy: [
      'rls_auditoria_producao: Privacidade: acesso excepcional só com autorização do Admin, enquanto vigente',
      'rls_auditoria_producao: Privacidade: só o Admin concede acesso excepcional (coordenação não)',
    ],
  },
  {
    id: 'excluido',
    text: 'Caso que você exclui sai da vista da coordenação e de qualquer autorização excepcional. O Admin ainda o vê até a exclusão definitiva.',
    verifiedBy: [
      'rls_auditoria_producao: Privacidade: caso excluído pelo aluno sai da vista da coordenação',
      'rls_auditoria_producao: Privacidade: caso excluído sai também do acesso excepcional',
      'rls_auditoria_producao: Privacidade: Admin continua vendo o caso excluído (exclusão definitiva é dele)',
    ],
  },
  {
    id: 'checklist',
    text: 'O checklist de materiais dos Workflows clínicos não é guardado no portal: fica só na aba aberta do seu aparelho.',
    verifiedBy: ['rls_workflows_clinicos: Checklist/progresso não fazem parte do banco (nenhuma coluna ou tabela de marcação)'],
  },
]

export const ACCESS_FACTS = {
  /** Toda abertura de caso pela coordenação/Admin fica registrada (Etapa 6). */
  caseOpenAudited: true,
  /** Toda abertura da produção individual pela coordenação/Admin fica registrada (Etapa 10). */
  productionOpenAudited: true,
  /** Caso que o aluno exclui sai da vista da coordenação e de acessos excepcionais; o Admin ainda o vê (exclusão definitiva). */
  removedCaseHiddenFromCoordination: true,
  /** Não há opção de privacidade configurável pelo aluno. */
  configurable: false,
} as const
