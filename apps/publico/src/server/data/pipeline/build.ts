/**
 * Pipeline completo: fonte → leitura (whitelist) → validação → montagem → DTO público.
 * Função pura em relação à fonte: os testes usam a mesma função com fixtures.
 */
import { SHEET_TABS, type TabKey } from '@/config/sheets'
import { PublicDatasetSchema } from '@/schemas/public'
import { REQUIRED_FIELDS, ROW_SCHEMAS } from '@/schemas/rows'
import { CriticalDataError, type DataIssue, type PortalData, type RawWorkbook, type SheetSource } from '../types'
import { assemble } from './assemble'
import { parseRecords } from './parse'
import { readTab } from './read'

const TAB_KEYS = Object.keys(SHEET_TABS) as TabKey[]

export const TAB_NAMES = TAB_KEYS.map((key) => SHEET_TABS[key].name)

export function buildFromWorkbook(workbook: RawWorkbook, source: SheetSource['kind'], now = new Date()): PortalData {
  const issues: DataIssue[] = []
  const parsed = {} as { [K in TabKey]: ReturnType<typeof parseRecords<(typeof ROW_SCHEMAS)[K]>>['rows'] }

  for (const key of TAB_KEYS) {
    const def = SHEET_TABS[key]
    const read = readTab(def, workbook[def.name])
    issues.push(...read.issues)
    if (!read.ok) {
      if (def.critical) {
        throw new CriticalDataError(`Aba crítica "${def.name}" indisponível ou sem colunas obrigatórias`, read.issues)
      }
      ;(parsed as Record<TabKey, unknown[]>)[key] = []
      continue
    }
    const result = parseRecords(ROW_SCHEMAS[key], read.records, REQUIRED_FIELDS[key], def.name)
    issues.push(...result.issues)
    ;(parsed as Record<TabKey, unknown[]>)[key] = result.rows
  }

  const tabs = Object.fromEntries(TAB_KEYS.map((key) => [key, SHEET_TABS[key].name])) as Record<TabKey, string>
  const domain = assemble({ tabs, ...parsed })
  issues.push(...domain.issues)

  const generatedAt = now.toISOString()
  // Portão de saída: somente chaves declaradas nos DTOs públicos sobrevivem.
  const dataset = PublicDatasetSchema.parse({
    version: 1,
    generatedAt,
    source,
    modules: domain.modules,
    classes: domain.classes,
    professors: domain.professors,
    materials: domain.materials,
    inventory: domain.inventory,
    equipment: domain.equipment,
    content: [],
  })

  return {
    dataset,
    report: {
      generatedAt,
      source,
      counts: {
        modules: dataset.modules.length,
        classes: dataset.classes.length,
        professors: dataset.professors.length,
        materials: dataset.materials.length,
        inventory: dataset.inventory.length,
        equipment: dataset.equipment.length,
      },
      issues,
    },
  }
}

export async function buildPortalData(source: SheetSource, now = new Date()): Promise<PortalData> {
  const workbook = await source.fetchTabs(TAB_NAMES)
  return buildFromWorkbook(workbook, source.kind, now)
}
