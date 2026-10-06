import type { Metadata } from 'next'
import { Filterable } from '@/components/filters/FilterPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ModuleRow } from '@/features/modules/ModuleRow'
import { ScheduleItem } from '@/features/modules/Schedule'
import { classFilterAttrs, moduleFilterAttrs, scheduleFilterDefs } from '@/features/modules/scheduleFilters'
import { formatMonthShort, todayISO } from '@/lib/dates'
import { moduleTiming, moduleYear, modulesInOrder, professorIndex, professorNames } from '@/lib/domain/selectors'
import { filterDataAttrs } from '@/lib/filters'
import type { PublicModule } from '@/schemas/public'
import { getDataset } from '@/server/data/repository'

export const metadata: Metadata = { title: 'Cronograma' }
export const revalidate = 300

function groupByYear(modules: PublicModule[]) {
  const groups: { key: string; label: string; modules: PublicModule[] }[] = []
  for (const m of modules) {
    const year = moduleYear(m)
    const key = year ? String(year) : 'sem-ano'
    let group = groups.find((g) => g.key === key)
    if (!group) groups.push((group = { key, label: year ? String(year) : 'Datas a confirmar', modules: [] }))
    group.modules.push(m)
  }
  // Módulos sem ano informado ficam ao final, na ordem numérica.
  return [...groups.filter((g) => g.key !== 'sem-ano'), ...groups.filter((g) => g.key === 'sem-ano')]
}

export default async function SchedulePage() {
  const ds = await getDataset()
  const today = todayISO()
  const defs = scheduleFilterDefs(ds)
  const modules = modulesInOrder(ds)
  const professors = professorIndex(ds)
  const count = `${modules.length} ${modules.length === 1 ? 'módulo' : 'módulos'}`

  return (
    <>
      <PageHeader
        title="Cronograma"
        description="Todos os módulos da especialização, em ordem. Combine filtros para encontrar aulas específicas."
      />
      {modules.length === 0 ? (
        <EmptyState title="O cronograma ainda está sendo preparado.">Os módulos aparecerão aqui assim que forem cadastrados.</EmptyState>
      ) : (
        <Filterable id="cronograma" defs={defs} countItem={['módulo', 'módulos']} countSub={['aula', 'aulas']} initialCount={count}>
          <div data-filter-empty="" hidden>
            <EmptyState title="Nenhum resultado para esses filtros.">Tente remover algum filtro.</EmptyState>
          </div>
          {groupByYear(modules).map((group) => (
            <section key={group.key} data-filter-group="" aria-labelledby={`ano-${group.key}`} className="mb-12">
              <h2
                id={`ano-${group.key}`}
                className={`font-display leading-none ${group.key === 'sem-ano' ? 'text-4xl md:text-5xl' : 'text-5xl md:text-6xl'}`}
              >
                {group.label}
              </h2>
              <div className="ruler mt-3 mb-1" aria-hidden />
              <ol>
                {group.modules.map((m) => {
                  const timing = moduleTiming(m, today)
                  const month = m.startDate?.slice(0, 7) ?? m.month
                  const { attrs, text } = moduleFilterAttrs(m)
                  const own = ds.classes.filter((c) => c.moduleSlug === m.slug)
                  return (
                    <li
                      key={m.slug}
                      className="grid grid-cols-1 md:grid-cols-[4rem_1fr] md:gap-x-4"
                      data-item=""
                      data-key={m.slug}
                      {...filterDataAttrs(attrs, text)}
                    >
                      <div className="hidden pt-6 md:block">
                        <span className="data text-xs font-medium tracking-widest text-muted">{month ? formatMonthShort(month) : '—'}</span>
                      </div>
                      <ModuleRow
                        module={m}
                        professors={professorNames(ds, m.professorSlugs)}
                        past={timing === 'past'}
                        current={timing === 'current'}
                        carry="professor"
                      >
                        {own.length ? (
                          <ol data-sub-list="" hidden className="rounded-md border border-rule bg-surface px-3">
                            {own.map((item) => {
                              const sub = classFilterAttrs(item)
                              return (
                                <ScheduleItem
                                  key={item.id}
                                  item={item}
                                  professors={professors}
                                  filterProps={{ 'data-sub-item': '', ...filterDataAttrs(sub.attrs, sub.text) }}
                                />
                              )
                            })}
                          </ol>
                        ) : null}
                      </ModuleRow>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </Filterable>
      )}
    </>
  )
}
