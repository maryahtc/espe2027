/**
 * Filtros do cronograma: definições + atributos de cada módulo/aula.
 * A página usa estes dados para gerar a marcação; os testes usam a mesma função.
 */
import { CLASS_TYPES } from '@/config/vocab'
import { searchText, type FilterAttrs, type FilterDef, type FilterableItem } from '@/lib/filters'
import { moduleLabel, moduleYear, modulesInOrder, scheduleYears } from '@/lib/domain/selectors'
import type { PublicClass, PublicDataset, PublicModule } from '@/schemas/public'

export function scheduleFilterDefs(ds: PublicDataset): FilterDef[] {
  const types = new Set(ds.classes.map((c) => c.type).filter((t) => t !== null))
  return [
    {
      param: 'ano',
      label: 'Ano',
      kind: 'select',
      level: 'item',
      options: scheduleYears(ds).map((y) => ({ value: String(y), label: String(y) })),
    },
    {
      param: 'modulo',
      label: 'Módulo',
      kind: 'select',
      level: 'item',
      options: modulesInOrder(ds).map((m) => ({ value: m.slug, label: `${moduleLabel(m)} · ${m.title ?? 'tema a confirmar'}` })),
    },
    {
      param: 'professor',
      label: 'Professor',
      kind: 'select',
      level: 'sub',
      highlight: true,
      options: ds.professors.map((p) => ({ value: p.slug, label: p.name })),
    },
    { param: 'tema', label: 'Tema', kind: 'text', level: 'sub', placeholder: 'Ex.: cerâmica' },
    {
      param: 'tipo',
      label: 'Tipo de aula',
      kind: 'select',
      level: 'sub',
      options: Object.entries(CLASS_TYPES)
        .filter(([key]) => types.has(key as keyof typeof CLASS_TYPES))
        .map(([value, def]) => ({ value, label: def.label })),
    },
  ]
}

export function moduleFilterAttrs(module: PublicModule): { attrs: FilterAttrs; text: string } {
  const year = moduleYear(module)
  return { attrs: { ano: year ? [String(year)] : [], modulo: [module.slug] }, text: searchText(module.title, module.description) }
}

export function classFilterAttrs(item: PublicClass): { attrs: FilterAttrs; text: string } {
  return {
    attrs: { professor: item.professorSlugs, tipo: item.type ? [item.type] : [] },
    text: searchText(item.title, item.description),
  }
}

/** Modelo filtrável do cronograma (o mesmo que a página serializa em data-attributes). */
export function scheduleItems(ds: PublicDataset): FilterableItem[] {
  return modulesInOrder(ds).map((m) => ({
    key: m.slug,
    ...moduleFilterAttrs(m),
    subs: ds.classes.filter((c) => c.moduleSlug === m.slug).map(classFilterAttrs),
  }))
}
