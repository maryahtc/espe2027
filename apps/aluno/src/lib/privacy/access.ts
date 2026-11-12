/**
 * Etapa 10 — quem pode ler os casos e a produção de um aluno, conforme as regras REAIS do banco. Fonte do texto de
 * "Privacidade" do Perfil (Parte 3): cada afirmação aqui é verificada em `packages/db/tests/rls_auditoria_producao.sql`
 * (bloco "Privacidade") e em `rls_casos.sql`. Se uma regra do banco mudar, este arquivo e esses testes mudam juntos.
 * Nenhuma configuração de privacidade existe para o aluno escolher: não há opção que "ainda não funciona".
 */
export type AccessRule = { who: string; what: string; verifiedBy: string }

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

export const ACCESS_FACTS = {
  /** Toda abertura de caso pela coordenação/Admin fica registrada (Etapa 6). */
  caseOpenAudited: true,
  /** Toda abertura da produção individual pela coordenação/Admin fica registrada (Etapa 10). */
  productionOpenAudited: true,
  /** Caso que o aluno exclui sai da vista da coordenação e de acessos excepcionais; o Admin ainda o vê (exclusão definitiva). */
  removedCaseHiddenFromCoordination: true,
} as const
