import { SearchBox } from '@/components/search/SearchBox'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/PageHeader'
import { siteConfig } from '@/config/site'
import { ModuleRow } from '@/features/modules/ModuleRow'
import { NextModuleHero } from '@/features/modules/NextModuleHero'
import { todayISO } from '@/lib/dates'
import {
  getNextModule,
  getUpcomingModules,
  moduleTiming,
  professorNames,
} from '@/lib/domain/selectors'
import { getDataset } from '@/server/data/repository'

// Mantenha igual a cacheConfig.revalidateSeconds (o Next exige um literal aqui).
export const revalidate = 300

export default async function HomePage() {
  const ds = await getDataset()
  const today = todayISO()
  const next = getNextModule(ds, today)
  const upcoming = getUpcomingModules(ds, today, siteConfig.upcomingModulesOnHome)

  return (
    <>
      <h1 className="sr-only">{siteConfig.name}</h1>
      <section className="pt-8 pb-8 md:pt-16 md:pb-12">
        <p className="mb-3 font-display text-[1.9rem] leading-tight md:text-[2.6rem]">O que você procura?</p>
        <SearchBox id="busca-home" mode="navigate" placeholder="Professor, módulo, tema, material…" label="Buscar no portal" size="lg" />
      </section>

      {next ? (
        <NextModuleHero
          module={next}
          professors={professorNames(ds, next.professorSlugs)}
          current={moduleTiming(next, today) === 'current'}
        />
      ) : ds.modules.length ? (
        <EmptyState title="Todos os módulos foram concluídos.">
          O cronograma completo continua disponível para consulta.
        </EmptyState>
      ) : (
        <EmptyState title="O cronograma ainda está sendo preparado.">
          Os módulos aparecerão aqui assim que forem cadastrados.
        </EmptyState>
      )}

      {upcoming.length ? (
        <section className="mt-14 md:mt-20" aria-label="Próximos módulos">
          <SectionHeader title="Próximos módulos" />
          <div className="-mt-4">
            {upcoming.map((m) => (
              <ModuleRow key={m.slug} module={m} professors={professorNames(ds, m.professorSlugs)} />
            ))}
          </div>
          <div className="border-t border-rule pt-5">
            <ArrowLink href="/cronograma">Ver cronograma completo</ArrowLink>
          </div>
        </section>
      ) : null}
    </>
  )
}
