import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchBox } from '@/components/search/SearchBox'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ArrowRight } from '@/components/ui/icons'
import { professorHref } from '@/lib/domain/selectors'
import { textMatches, type SearchParams } from '@/lib/filters'
import { normalizeText, padModuleNumber } from '@/lib/text'
import { getDataset } from '@/server/data/repository'

export const metadata: Metadata = { title: 'Professores' }

export default async function ProfessorsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const ds = await getDataset()
  const raw = (await searchParams).q
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 80) ?? ''

  const list = ds.professors
    .filter((p) => !q || textMatches(q, p.name, p.specialty))
    .map((p) => ({
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
      <PageHeader title="Professores" description={`${ds.professors.length} professores participam da especialização.`} />
      <div className="mb-8 max-w-xl">
        <SearchBox action="/professores" defaultValue={q} placeholder="Pesquisar professor" label="Pesquisar professor" live />
      </div>

      {list.length === 0 ? (
        q ? (
          <EmptyState title={`Nenhum professor encontrado para “${q}”.`}>Confira a grafia ou busque pelo sobrenome.</EmptyState>
        ) : (
          <EmptyState title="Nenhum professor cadastrado ainda." />
        )
      ) : (
        <div className="grid gap-x-12 md:grid-cols-2">
          {[...groups].map(([letter, people]) => (
            <section key={letter} aria-label={`Letra ${letter}`} className="mb-6 break-inside-avoid">
              <h2 className="font-display text-3xl leading-none text-faint">{letter}</h2>
              <ul className="mt-2 border-t border-rule">
                {people.map((p) => (
                  <li key={p.slug} className="border-b border-rule">
                    <Link href={professorHref(p.slug)} className="group flex min-h-16 items-center justify-between gap-4 py-3">
                      <span className="min-w-0">
                        <span className="block text-[17px] font-semibold text-ink">{p.name}</span>
                        <span className="block text-sm text-muted">
                          {[p.specialty, p.modules.length ? `Módulo${p.modules.length > 1 ? 's' : ''} ${p.modules.map(padModuleNumber).join(', ')}` : null]
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
      )}
    </>
  )
}
