/**
 * Monta o domínio público a partir das linhas validadas:
 * vínculos (aula ↔ professor, material ↔ estoque), slugs, status calculados,
 * datas derivadas e checagens de consistência.
 */
import { PERIODS } from '@/config/vocab'
import { siteConfig } from '@/config/site'
import { computeAvailability, computeInventoryStatus } from '@/lib/domain/availability'
import { compareISO } from '@/lib/dates'
import { normalizeText, padModuleNumber, slugify } from '@/lib/text'
import type {
  PublicClass,
  PublicEquipment,
  PublicInventoryItem,
  PublicMaterial,
  PublicModule,
  PublicProfessor,
} from '@/schemas/public'
import type { ClassRow, EquipmentRow, InventoryRow, MaterialRow, ModuleRow, ProfessorRow } from '@/schemas/rows'
import type { DataIssue } from '../types'
import type { Parsed } from './parse'
import { ProfessorRegistry } from './professors'

export type AssembleInput = {
  tabs: { modules: string; classes: string; professors: string; materials: string; inventory: string; equipment: string }
  modules: Parsed<ModuleRow>[]
  classes: Parsed<ClassRow>[]
  professors: Parsed<ProfessorRow>[]
  materials: Parsed<MaterialRow>[]
  inventory: Parsed<InventoryRow>[]
  equipment: Parsed<EquipmentRow>[]
}

export type AssembleOutput = {
  modules: PublicModule[]
  classes: PublicClass[]
  professors: PublicProfessor[]
  materials: PublicMaterial[]
  inventory: PublicInventoryItem[]
  equipment: PublicEquipment[]
  issues: DataIssue[]
}

const PERIOD_START: Record<keyof typeof PERIODS, string> = {
  integral: '00:00',
  manha: '08:00',
  tarde: '13:00',
  noite: '19:00',
}

const MONTH_KEYS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function inCourse(date: string): boolean {
  return date >= siteConfig.courseStart && date <= siteConfig.courseEnd
}

export function assemble(input: AssembleInput): AssembleOutput {
  const { tabs } = input
  const issues: DataIssue[] = []
  const registry = new ProfessorRegistry(input.professors, tabs.professors, tabs.classes)

  // ── Módulos ────────────────────────────────────────────────────────────────
  // A planilha é soberana: nenhum dado é deduzido, completado ou corrigido.
  // Números repetidos são mantidos (com aviso), cada linha vira um módulo.
  type ModuleEntry = { row: Parsed<ModuleRow>; slug: string; month: number | null }
  const moduleEntries: ModuleEntry[] = []
  const hiddenNumbers = new Set<number>()
  const seenNumbers = new Set<number>()
  for (const row of input.modules) {
    if (seenNumbers.has(row.number)) {
      issues.push({ severity: 'warning', code: 'duplicate_module', tab: tabs.modules, row: row.row, field: 'Módulo' })
    }
    seenNumbers.add(row.number)
    if (row.status === 'rascunho') {
      hiddenNumbers.add(row.number)
      continue
    }
    for (const field of ['startDate', 'endDate'] as const) {
      const value = row[field]
      if (value && !inCourse(value)) {
        issues.push({ severity: 'warning', code: 'date_out_of_course', tab: tabs.modules, row: row.row, field })
      }
    }
    if (row.startDate && row.endDate && row.endDate < row.startDate) {
      issues.push({ severity: 'warning', code: 'date_range_inverted', tab: tabs.modules, row: row.row })
    }
    const sameNumber = moduleEntries.filter((e) => e.row.number === row.number).length
    const base = padModuleNumber(row.number)
    moduleEntries.push({
      row,
      slug: sameNumber === 0 ? base : `${base}-${sameNumber + 1}`,
      month: row.plannedMonth ? Number(row.plannedMonth.slice(-2)) : null,
    })
  }
  for (const entry of moduleEntries) hiddenNumbers.delete(entry.row.number)
  const duplicated = new Set(
    moduleEntries.filter((e, _i, all) => all.filter((o) => o.row.number === e.row.number).length > 1).map((e) => e.row.number),
  )

  /** Encontra o módulo de uma aula. Com número repetido, desempata pelo mês escrito na célula ("9 (NOV)"). */
  function findModule(row: Parsed<ClassRow>): ModuleEntry | null | 'ambiguous' {
    const candidates = moduleEntries.filter((e) => e.row.number === row.module)
    if (candidates.length <= 1) return candidates[0] ?? null
    const label = normalizeText(row.moduleLabel ?? '')
    const months = label
      .split(' ')
      .map((word) => MONTH_KEYS.indexOf(word.slice(0, 3)) + 1)
      .filter((m) => m > 0)
    const byMonth = candidates.filter((c) => c.month !== null && months.includes(c.month))
    return byMonth.length === 1 ? byMonth[0]! : 'ambiguous'
  }

  // ── Aulas ──────────────────────────────────────────────────────────────────
  type Draft = Omit<PublicClass, 'id'> & { row: number; moduleOrder: number }
  const drafts: Draft[] = []
  const implicitModules = new Map<number, string>()
  for (const row of input.classes) {
    if (row.status === 'rascunho' || hiddenNumbers.has(row.module)) continue
    let entry = findModule(row)
    if (entry === 'ambiguous') {
      issues.push({ severity: 'warning', code: 'module_ambiguous', tab: tabs.classes, row: row.row, field: 'Módulo' })
      entry = moduleEntries.find((e) => e.row.number === row.module)!
    }
    if (!entry && !implicitModules.has(row.module)) {
      implicitModules.set(row.module, padModuleNumber(row.module))
      issues.push({ severity: 'warning', code: 'module_implicit', tab: tabs.classes, row: row.row, field: 'Módulo' })
    }
    const moduleRow = entry?.row
    const notices: PublicClass['notices'] = []
    if (row.date && !inCourse(row.date)) {
      notices.push('data-inconsistente')
      issues.push({ severity: 'warning', code: 'date_out_of_course', tab: tabs.classes, row: row.row, field: 'Data' })
    } else if (row.date && moduleRow?.startDate && moduleRow.endDate) {
      if (row.date < moduleRow.startDate || row.date > moduleRow.endDate) {
        notices.push('data-inconsistente')
        issues.push({ severity: 'warning', code: 'date_out_of_module', tab: tabs.classes, row: row.row, field: 'Data' })
      }
    }
    const professorSlugs = [...new Set(row.professors.map((name) => registry.resolve(name, row.row)))]
    const moduleSlug = entry?.slug ?? padModuleNumber(row.module)
    drafts.push({
      row: row.row,
      moduleOrder: entry ? moduleEntries.indexOf(entry) : moduleEntries.length + row.module,
      moduleNumber: row.module,
      moduleSlug,
      day: row.day,
      date: row.date,
      start: row.start,
      end: row.end,
      period: row.period,
      title: row.title,
      description: row.description,
      type: row.type,
      professorSlugs,
      publicNotes: row.publicNotes,
      status: row.status === 'a-confirmar' || moduleRow?.status === 'a-confirmar' ? 'a-confirmar' : 'confirmado',
      notices,
    })
  }

  const timeKey = (c: Draft) => c.start ?? (c.period ? PERIOD_START[c.period] : '99:99')
  drafts.sort(
    (a, b) =>
      a.moduleNumber - b.moduleNumber ||
      a.moduleOrder - b.moduleOrder ||
      // "Dia do módulo" (quando as duas aulas têm) vem antes da data: ordem da própria planilha.
      (a.day !== null && b.day !== null ? a.day - b.day : 0) ||
      compareISO(a.date, b.date) ||
      (a.day ?? 99) - (b.day ?? 99) ||
      timeKey(a).localeCompare(timeKey(b)) ||
      a.row - b.row,
  )
  const counters = new Map<string, number>()
  const classes: PublicClass[] = drafts.map(({ row: _row, moduleOrder: _order, ...draft }) => {
    const seq = (counters.get(draft.moduleSlug) ?? 0) + 1
    counters.set(draft.moduleSlug, seq)
    return { id: `m${draft.moduleSlug}-a${String(seq).padStart(2, '0')}`, ...draft }
  })

  // ── Módulos finais (inclui implícitos) + campos derivados ─────────────────
  const allModules: { number: number; slug: string; row: Parsed<ModuleRow> | null }[] = [
    ...moduleEntries.map((e) => ({ number: e.row.number, slug: e.slug, row: e.row })),
    ...[...implicitModules].map(([number, slug]) => ({ number, slug, row: null })),
  ].sort((a, b) => a.number - b.number)

  const modules: PublicModule[] = allModules.map(({ number, slug, row }) => {
    const own = classes.filter((c) => c.moduleSlug === slug)
    // Datas derivadas só de aulas sem inconsistência — nada é "consertado".
    const dates = own
      .filter((c) => c.notices.length === 0)
      .map((c) => c.date)
      .filter((d): d is string => d !== null)
      .sort()
    const startDate = row?.startDate ?? dates[0] ?? null
    const endDate = row?.endDate ?? dates.at(-1) ?? startDate
    return {
      number,
      slug,
      month: row?.plannedMonth ?? startDate?.slice(0, 7) ?? null,
      startDate,
      endDate,
      title: row?.title ?? null,
      description: row?.description ?? null,
      status: row?.status === 'a-confirmar' ? 'a-confirmar' : 'confirmado',
      notices: duplicated.has(number) ? ['numero-repetido'] : [],
      professorSlugs: [...new Set(own.flatMap((c) => c.professorSlugs))],
    }
  })
  const visibleModules = new Set(modules.map((m) => m.number))
  const firstSlug = new Map<number, string>()
  for (const m of modules) if (!firstSlug.has(m.number)) firstSlug.set(m.number, m.slug)
  const participating = new Set(classes.flatMap((c) => c.professorSlugs))

  // ── Estoque ────────────────────────────────────────────────────────────────
  const inventory: (PublicInventoryItem & { nameKey: string; brandKey: string })[] = []
  const usedKeys = new Set<string>()
  for (const row of input.inventory) {
    const base = slugify(`${row.material} ${row.brandSpec ?? ''}`) || 'item'
    let key = base
    for (let i = 2; usedKeys.has(key); i++) key = `${base}-${i}`
    usedKeys.add(key)
    inventory.push({
      key,
      name: row.material,
      category: row.category,
      brandSpec: row.brandSpec,
      unit: row.unit,
      current: row.current,
      minimum: row.minimum,
      updatedAt: row.updatedAt,
      status: computeInventoryStatus(row.current, row.minimum),
      moduleNumbers: [],
      nameKey: normalizeText(row.material),
      brandKey: normalizeText(row.brandSpec ?? ''),
    })
  }

  function findInventory(name: string, brand: string | null) {
    const nameKey = normalizeText(name)
    const sameName = inventory.filter((item) => item.nameKey === nameKey)
    if (sameName.length <= 1) return sameName[0]
    const brandKey = normalizeText(brand ?? '')
    return sameName.find((item) => item.brandKey === brandKey)
  }

  // ── Materiais por módulo ──────────────────────────────────────────────────
  const materials: PublicMaterial[] = []
  for (const row of input.materials) {
    if (!visibleModules.has(row.module)) continue
    const stock = findInventory(row.material, row.brandSpec)
    if (!stock) {
      issues.push({ severity: 'warning', code: 'material_not_in_inventory', tab: tabs.materials, row: row.row, field: 'Material' })
    } else if (!stock.moduleNumbers.includes(row.module)) {
      stock.moduleNumbers.push(row.module)
    }
    const availability = computeAvailability(row.required, stock?.current ?? null)
    const professorSlug = row.professor ? registry.find(row.professor) : null
    materials.push({
      id: `mat-${row.row}`,
      moduleNumber: row.module,
      moduleSlug: firstSlug.get(row.module) ?? null,
      classTitle: row.classTitle,
      professorSlug: professorSlug && participating.has(professorSlug) ? professorSlug : null,
      name: row.material,
      brandSpec: row.brandSpec ?? stock?.brandSpec ?? null,
      category: stock?.category ?? null,
      inventoryKey: stock?.key ?? null,
      ...availability,
    })
  }
  materials.sort((a, b) => a.moduleNumber - b.moduleNumber || a.name.localeCompare(b.name, 'pt-BR'))

  // ── Equipamentos ──────────────────────────────────────────────────────────
  const equipment: PublicEquipment[] = input.equipment.map((row) => ({
    id: `eq-${row.row}`,
    name: row.name,
    category: row.category,
    moduleNumbers: row.modules.filter((n) => !hiddenNumbers.has(n)),
    ...computeAvailability(row.required, row.available),
  }))

  // ── Professores: só quem participa de alguma aula publicada ─────────────────
  const professors = registry
    .all()
    .filter((p) => participating.has(p.slug))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return {
    modules,
    classes,
    professors,
    materials,
    inventory: inventory
      .map(({ nameKey: _n, brandKey: _b, ...item }) => ({ ...item, moduleNumbers: item.moduleNumbers.sort((a, b) => a - b) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    equipment: equipment.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    issues: [...registry.issues, ...issues],
  }
}
