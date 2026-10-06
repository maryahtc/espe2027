/** Estratégia de atualização dos dados vindos da planilha. */
export const cacheConfig = {
  /** Intervalo máximo (segundos) entre uma alteração na planilha e o portal refleti-la. */
  revalidateSeconds: 300,
  /** Tag usada por POST /api/revalidar para forçar atualização. */
  tag: 'portal-data',
  /** Chave do cache — mude o sufixo quando o formato do PublicDataset mudar. */
  key: 'portal-data-v1',
  /** Tempo máximo de cada chamada à API do Google. */
  fetchTimeoutMs: 8000,
  /** Novas tentativas em caso de falha de rede/5xx. */
  retries: 1,
} as const
