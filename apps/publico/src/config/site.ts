/**
 * Configurações gerais do portal. Textos e parâmetros que mudam com o tempo
 * ficam aqui — nunca espalhados pelos componentes.
 */
export const siteConfig = {
  /** Nome exibido no cabeçalho e no título das páginas. */
  name: 'Especialização em Odontologia',
  shortName: 'Especialização',
  description:
    'Portal de consulta da especialização: cronograma, módulos, professores, materiais e equipamentos.',
  locale: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  /** Período do curso — datas fora dele geram aviso de validação. */
  courseStart: '2027-01-01',
  courseEnd: '2029-12-31',
  /** Quantos módulos aparecem em "Próximos módulos" na Home. */
  upcomingModulesOnHome: 3,
} as const
