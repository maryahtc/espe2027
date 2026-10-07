/**
 * Ponto ÚNICO de acesso aos dados do portal.
 *
 * - Cache compartilhado (tag "portal-data"), revalidado a cada cacheConfig.revalidateSeconds.
 * - Se o banco ou a planilha falharem, a função lança erro: o Next continua servindo a última
 *   versão válida do cache e tenta de novo na próxima requisição.
 * - Cópia em memória da última versão válida cobre instâncias sem cache ainda.
 */
import 'server-only'
import { unstable_cache } from 'next/cache'
import { cacheConfig } from '@/config/cache'
import { errorMessage, log } from '@/lib/log'
import type { PublicDataset } from '@/schemas/public'
import { buildPortalData } from './pipeline/build'
import { createAcademicLoader, createSheetSource } from './source'
import type { PortalData } from './types'

let lastGood: PortalData | null = null

async function load(): Promise<PortalData> {
  const started = Date.now()
  try {
    const data = await buildPortalData(createSheetSource(), new Date(), createAcademicLoader())
    const errors = data.report.issues.filter((i) => i.severity === 'error').length
    log.info('portal.data_loaded', {
      source: data.report.source,
      academic: data.report.academicSource,
      ms: Date.now() - started,
      ...data.report.counts,
      issues: data.report.issues.length,
      errors,
    })
    for (const issue of data.report.issues) {
      log.warn(`sheets.${issue.code}`, { severity: issue.severity, tab: issue.tab, row: issue.row, field: issue.field })
    }
    return data
  } catch (error) {
    log.error('portal.data_failed', { ms: Date.now() - started, message: errorMessage(error) })
    throw error
  }
}

const cachedLoad = unstable_cache(load, [cacheConfig.key], {
  tags: [cacheConfig.tag],
  revalidate: cacheConfig.revalidateSeconds,
})

export async function getPortalData(): Promise<PortalData> {
  try {
    const data = await cachedLoad()
    lastGood = data
    return data
  } catch (error) {
    if (lastGood) {
      log.warn('portal.serving_last_good', { generatedAt: lastGood.report.generatedAt })
      return lastGood
    }
    throw error
  }
}

export async function getDataset(): Promise<PublicDataset> {
  return (await getPortalData()).dataset
}
