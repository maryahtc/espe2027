/** Estratégia de atualização dos dados (banco: cronograma, módulos, professores; planilha: logística). */
export const cacheConfig = {
  /** Intervalo máximo (segundos) entre uma alteração (no Admin ou na planilha) e o portal refleti-la. */
  revalidateSeconds: 60,
  /** Tag usada por POST /api/revalidar para forçar atualização. */
  tag: 'portal-data',
  /** Chave do cache — mude o sufixo quando o formato do PublicDataset mudar. */
  key: 'portal-data-v2',
  /** Tempo máximo de cada chamada (banco ou API do Google). */
  fetchTimeoutMs: 8000,
  /** Novas tentativas em caso de falha de rede/5xx. */
  retries: 1,
} as const
