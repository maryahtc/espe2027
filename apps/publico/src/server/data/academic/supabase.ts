/**
 * Leitura das visões públicas do banco (Supabase) pela API REST, com a chave pública (publishable).
 *
 * Essa chave só tem permissão de leitura em `public_modules`, `public_schedule` e `public_teachers`;
 * as tabelas continuam fechadas pela RLS. A chave secreta nunca é usada no portal público.
 */
import 'server-only'
import { cacheConfig } from '@/config/cache'
import type { AcademicRows } from './map'

export type SupabaseReadConfig = { url: string; key: string }

export function readSupabaseConfigFromEnv(): SupabaseReadConfig | null {
  const url = process.env.SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !key) return null
  if (key.startsWith('sb_secret_')) throw new Error('SUPABASE_PUBLISHABLE_KEY recebeu a chave secreta. Use a chave pública (publishable).')
  return { url: url.replace(/\/+$/, ''), key }
}

const VIEWS = {
  modules: 'public_modules',
  schedule: 'public_schedule',
  teachers: 'public_teachers',
} as const

async function fetchView<T>(config: SupabaseReadConfig, view: string, fetchImpl: typeof fetch): Promise<T[]> {
  let lastError: unknown
  for (let attempt = 0; attempt <= cacheConfig.retries; attempt++) {
    try {
      const res = await fetchImpl(`${config.url}/rest/v1/${view}?select=*`, {
        headers: { apikey: config.key, Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(cacheConfig.fetchTimeoutMs),
      })
      if (!res.ok) throw new Error(`Banco respondeu ${res.status} ao ler ${view}`)
      const data = (await res.json()) as unknown
      if (!Array.isArray(data)) throw new Error(`Resposta inesperada ao ler ${view}`)
      return data as T[]
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

/** Busca as três visões. LANÇA erro em falha (o portal continua servindo a última versão válida). */
export async function fetchAcademicRows(config: SupabaseReadConfig, fetchImpl: typeof fetch = fetch): Promise<AcademicRows> {
  const [modules, schedule, teachers] = await Promise.all([
    fetchView<AcademicRows['modules'][number]>(config, VIEWS.modules, fetchImpl),
    fetchView<AcademicRows['schedule'][number]>(config, VIEWS.schedule, fetchImpl),
    fetchView<AcademicRows['teachers'][number]>(config, VIEWS.teachers, fetchImpl),
  ])
  return { modules, schedule, teachers }
}
