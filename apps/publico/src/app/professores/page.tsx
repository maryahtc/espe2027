import type { Metadata } from 'next'
import Link from 'next/link'
import { Activate } from '@/components/Enhancer'
import { SearchBox } from '@/components/search/SearchBox'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ArrowRight } from '@/components/ui/icons'
import { professorHref } from '@/lib/domain/selectors'
import { filterDataAttrs, searchText, type FilterDef } from '@/lib/filters'
import { normalizeText, padModuleNumber } from '@/lib/text'
import { getDataset } from '@/server/data/repository'

export const metadata: Metadata = { title: 'Professores' }
export const revalidate = 60

const defs: FilterDef[] = [{ param: 'q', label: 'Professor', kind: 'text', level: 'item' }]

export default async function ProfessorsPage() {
  const ds = await getDataset()
  const list = ds.professors.map((p) => ({
    ...p,
    modules: [...new Set(ds.classes.filter((c) => c.professorSlugs.includes(p.slug)).map((c) => c.moduleNumber))].sort(
      (a, b) => a - b,
    ),
  }))
  const groups = new Map<string, typeof list>()
  for (const p of list) {
    const letter = normalizeText(p.name).charAt(0).toUpperCase() || '#'
    groups.set(letter, [...(groups.get(letter) ?? []), p])
  }

  return (
    <>
      <PageHeader title="Professores" description={`${ds.professors.length} professores com aulas no cronograma.`} />
      {list.length === 0 ? (
        <EmptyState title="Nenhum professor com aula publicada ainda." />
      ) : (
        <div data-filters="" data-count-item="professor|professores">
          <script type="application/json" data-filter-defs="" dangerouslySetInnerHTML={{ __html: JSON.stringify(defs) }} />
          <div className="mb-8 max-w-xl">
            <SearchBox id="busca-professores" mode="filter" placeholder="Pesquisar professor" label="Pesquisar professor" />
          </div>
          <div data-filter-empty="" hidden>
            <EmptyState title="Nenhum professor encontrado.">
              Nada encontrado para “<span data-filter-echo="q" />”. Confira a grafia ou busque por outra parte do nome.
            </EmptyState>
          </div>
          <div className="grid gap-x-12 md:grid-cols-2">
            {[...groups].map(([letter, people]) => (
              <section key={letter} data-filter-group="" aria-label={`Letra ${letter}`} className="mb-6">
                <h2 className="font-display text-3xl leading-none text-faint">{letter}</h2>
                <ul className="mt-2 border-t border-rule">
                  {people.map((p) => (
                    <li
                      key={p.slug}
                      className="border-b border-rule"
                      data-item=""
                      data-key={p.slug}
                      {...filterDataAttrs({}, searchText(p.name, p.specialty))}
                    >
                      <Link href={professorHref(p.slug)} className="group flex min-h-16 items-center justify-between gap-4 py-3">
                        <span className="min-w-0">
                          <span className="block text-[17px] font-semibold text-ink">{p.name}</span>
                          <span className="block text-sm text-muted">
                            {[
                              p.specialty,
                              p.modules.length ? `Módulo${p.modules.length > 1 ? 's' : ''} ${p.modules.map(padModuleNumber).join(', ')}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </span>
                        <ArrowRight width={16} height={16} className="shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <Activate />
        </div>
      )}
    </>
  )
}
