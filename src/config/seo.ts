/**
 * Indexação por buscadores. Padrão: NÃO indexar.
 * Troque com a variável de ambiente PORTAL_INDEXING=index (sem mudar código).
 */
export function isIndexingEnabled(): boolean {
  return process.env.PORTAL_INDEXING === 'index'
}

export function baseUrl(): string {
  return process.env.PORTAL_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000'
}
