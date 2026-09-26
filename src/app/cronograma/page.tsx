import type { Metadata } from 'next'
import { ActiveFilters } from '@/components/filters/ActiveFilters'
import { FilterPanel } from '@/components/filters/FilterPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ModuleRow } from '@/features/modules/ModuleRow'
import { ScheduleItem } from '@/features/modules/Schedule'
import { filterSchedule, scheduleFilterDefs, type ScheduleEntry } from '@/features/modules/scheduleFilters'
import { formatMonthShort, todayISO } from '@/lib/dates'
import { moduleHref, moduleTiming, professorIndex, professorNames } from '@/lib/domain/selectors'
import { activeFilters, parseFilters, type SearchParams } from '@/lib/filters'
import { getDataset } from '@/server/data/repository'

export const metadata: Metadata = { title: 'Cronograma' }

const PATH = '/cronograma'

function groupByYear(entries: ScheduleEntry[]) {
  const groups: { year: string; entries: ScheduleEntry[] }[] = []
  for (const entry of entries) {
    const date = entry.module.startDate ?? entry.module.month
    const year = date ? date.slice(0, 4) : 'Sem data'
    let group = groups.find((g) => g.year === year)
    if (!group) groups.push((group = { year, entries: [] }))
    group.entries.push(entry)
  }
  return groups
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ds = await getDataset()
  const today = todayISO()
  const defs = scheduleFilterDefs(ds)
  const state = parseFilters(await searchParams, defs)
  const entries = filterSchedule(ds, state)
  const professors = professorIndex(ds)
  const classCount = entries.reduce((n, e) => n + e.classes.length, 0)
  const filtered = entries.some((e) => e.filteredByClass)
  const resultLabel = `${entries.length} ${entries.length === 1 ? 'módulo' : 'módulos'}${
    filtered ? ` · ${classCount} ${classCount === 1 ? 'aula' : 'aulas'}` : ''
  }`

  return (
    <>
      <PageHeader title="Cronograma" description="Todos os módulos da especialização, em ordem. Combine filtros para encontrar aulas específicas." />
      <FilterPanel pathname={PATH} defs={defs} state={state} resultLabel={resultLabel} />
      <ActiveFilters filters={activeFilters(PATH, defs, state)} clearHref={PATH} />

      {entries.length === 0 ? (
        <EmptyState
          title={ds.modules.length ? 'Nenhum resultado para esses filtros.' : 'O cronograma ainda está sendo preparado.'}
        >
          {ds.modules.length ? 'Tente remover algum filtro.' : 'Os módulos aparecerão aqui assim que forem cadastrados.'}
        </EmptyState>
      ) : (
        groupByYear(entries).map((group) => (
          <section key={group.year} aria-labelledby={`ano-${group.year}`} className="mb-12">
            <div className="flex items-end gap-4">
              <h2 id={`ano-${group.year}`} className="font-display text-5xl leading-none md:text-6xl">
                {group.year}
              </h2>
            </div>
            <div className="ruler mt-3 mb-1" aria-hidden />
            <ol>
              {group.entries.map(({ module, classes, filteredByClass }) => {
                const timing = moduleTiming(module, today)
                const month = module.startDate?.slice(0, 7) ?? module.month
                return (
                  <li key={module.number} className="grid grid-cols-1 md:grid-cols-[4rem_1fr] md:gap-x-4">
                    <div className="relative hidden pt-6 md:block">
                      <span className="data text-xs font-medium tracking-widest text-muted">{month ? formatMonthShort(month) : '—'}</span>
                    </div>
                    <ModuleRow
                      module={module}
                      professors={professorNames(ds, module.professorSlugs)}
                      href={state.professor ? `${moduleHref(module)}?professor=${state.professor}` : moduleHref(module)}
                      muted={timing === 'past' && !filteredByClass}
                      current={timing === 'current'}
                    >
                      {filteredByClass && classes.length ? (
                        <ol className="rounded-md border border-rule bg-surface px-3">
                          {classes.map((item) => (
                            <ScheduleItem key={item.id} item={item} professors={professors} highlightSlug={state.professor} />
                          ))}
                        </ol>
                      ) : null}
                    </ModuleRow>
                  </li>
                )
              })}
            </ol>
          </section>
        ))
      )}
    </>
  )
}
