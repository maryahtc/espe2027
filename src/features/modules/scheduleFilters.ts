/**
 * Filtros do cronograma. Definidos uma vez e usados pela página e pelos testes.
 */
import { CLASS_TYPES } from '@/config/vocab'
import { applyFilters, textMatches, type FilterDef, type FilterState } from '@/lib/filters'
import { moduleLabel, moduleYear, scheduleYears } from '@/lib/domain/selectors'
import type { PublicClass, PublicDataset, PublicModule } from '@/schemas/public'

export function scheduleFilterDefs(ds: PublicDataset): FilterDef[] {
  const types = [...new Set(ds.classes.map((c) => c.type).filter((t) => t !== null))]
  return [
    { param: 'ano', label: 'Ano', kind: 'select', options: scheduleYears(ds).map((y) => ({ value: String(y), label: String(y) })) },
    {
      param: 'modulo',
      label: 'Módulo',
      kind: 'select',
      options: [...ds.modules]
        .sort((a, b) => a.number - b.number)
        .map((m) => ({ value: m.slug, label: `${moduleLabel(m)}${m.title ? ` · ${m.title}` : ''}` })),
    },
    { param: 'professor', label: 'Professor', kind: 'select', options: ds.professors.map((p) => ({ value: p.slug, label: p.name })) },
    { param: 'tema', label: 'Tema', kind: 'text', placeholder: 'Ex.: cerâmica' },
    {
      param: 'tipo',
      label: 'Tipo de aula',
      kind: 'select',
      options: Object.entries(CLASS_TYPES)
        .filter(([key]) => types.includes(key as keyof typeof CLASS_TYPES))
        .map(([value, def]) => ({ value, label: def.label })),
    },
  ]
}

export type ScheduleEntry = { module: PublicModule; classes: PublicClass[]; filteredByClass: boolean }

export function filterSchedule(ds: PublicDataset, state: FilterState): ScheduleEntry[] {
  const modules = applyFilters([...ds.modules].sort((a, b) => a.number - b.number), state, {
    ano: (m, v) => String(moduleYear(m)) === v,
    modulo: (m, v) => m.slug === v,
  })
  const classFilterActive = ['professor', 'tipo', 'tema'].some((p) => state[p])

  return modules.flatMap((module): ScheduleEntry[] => {
    const own = ds.classes.filter((c) => c.moduleNumber === module.number)
    if (!classFilterActive) return [{ module, classes: own, filteredByClass: false }]
    const matching = applyFilters(own, state, {
      professor: (c, v) => c.professorSlugs.includes(v),
      tipo: (c, v) => c.type === v,
      tema: (c, v) => textMatches(v, c.title, c.description, module.title),
    })
    const titleOnly = !!state.tema && !state.professor && !state.tipo && textMatches(state.tema, module.title, module.description)
    if (matching.length === 0 && !titleOnly) return []
    return [{ module, classes: matching, filteredByClass: true }]
  })
}
