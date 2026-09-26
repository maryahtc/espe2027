/**
 * Log estruturado (JSON em uma linha) para o servidor.
 * Regra: nunca registrar VALORES de células — apenas aba, linha, campo e código.
 */
type Level = 'info' | 'warn' | 'error'
type Fields = Record<string, string | number | boolean | null | undefined | string[]>

function write(level: Level, event: string, fields: Fields = {}) {
  if (process.env.NODE_ENV === 'test' && !process.env.LOG_IN_TESTS) return
  const line = JSON.stringify({ level, event, ...fields, at: new Date().toISOString() })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.info(line)
}

export const log = {
  info: (event: string, fields?: Fields) => write('info', event, fields),
  warn: (event: string, fields?: Fields) => write('warn', event, fields),
  error: (event: string, fields?: Fields) => write('error', event, fields),
}

/** Mensagem de erro segura para log (sem stack com dados). */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
