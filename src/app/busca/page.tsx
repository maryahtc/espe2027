import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchBox } from '@/components/search/SearchBox'
import { ArrowLink } from '@/components/ui/ArrowLink'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/PageHeader'
import type { SearchParams } from '@/lib/filters'
import { search, type SearchKind } from '@/lib/search'
import { getDataset } from '@/server/data/repository'

export const metadata: Metadata = { title: 'Busca' }

const KINDS: SearchKind[] = ['professor', 'module', 'class', 'material', 'equipment']

function seeAllHref(kind: SearchKind, q: string): string {
  return `/busca?q=${encodeURIComponent(q)}&grupo=${kind}`
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const raw = params.q
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 80) ?? ''
  const only = KINDS.find((k) => k === params.grupo)
  const ds = await getDataset()
  const all = q ? search(ds, q, only ? Number.POSITIVE_INFINITY : 5) : []
  const groups = only ? all.filter((g) => g.kind === only) : all
  const total = groups.reduce((n, g) => n + g.total, 0)

  return (
    <>
      <div className="pt-8 pb-8 md:pt-14">
        <h1 className="mb-3 font-display text-[1.9rem] leading-tight md:text-[2.6rem]">O que você procura?</h1>
        <SearchBox
          action="/busca"
          defaultValue={q}
          placeholder="Professor, módulo, tema, material…"
          label="Buscar no portal"
          size="lg"
          live
          autoFocus={!q}
        />
        {q ? (
          <p className="data mt-3 text-xs text-muted" aria-live="polite">
            {total} {total === 1 ? 'resultado' : 'resultados'}
          </p>
        ) : null}
      </div>

      {only && q ? (
        <p className="-mt-4 mb-8">
          <Link href={`/busca?q=${encodeURIComponent(q)}`} className="link-underline text-sm">
            ← Todos os resultados para “{q}”
          </Link>
        </p>
      ) : null}

      {!q ? (
        <p className="text-muted">
          Busque pelo nome de um professor, número do módulo (ex.: <Link className="link-underline" href="/busca?q=modulo 7">módulo 7</Link>), tema
          (ex.: <Link className="link-underline" href="/busca?q=cerâmica">cerâmica</Link>) ou material.
        </p>
      ) : groups.length === 0 ? (
        <EmptyState title={`Nenhum resultado encontrado para “${q}”.`}>
          Tente outro termo, parte do nome ou sem abreviações.
        </EmptyState>
      ) : (
        <div className="space-y-12">
          {groups.map((group) => (
            <section key={group.kind} aria-label={group.label}>
              <SectionHeader title={group.label} count={group.total} />
              <ul className="-mt-2">
                {group.hits.map((hit) => (
                  <li key={`${hit.kind}-${hit.id}`} className="border-b border-rule">
                    <Link href={hit.href} className="group block py-3.5">
                      <span className="block text-[17px] font-semibold text-ink group-hover:underline group-hover:decoration-rule-strong group-hover:underline-offset-4">
                        {hit.title}
                      </span>
                      {hit.subtitle ? <span className="mt-0.5 block text-sm text-muted">{hit.subtitle}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
              {group.total > group.hits.length ? (
                <div className="pt-3">
                  <ArrowLink href={seeAllHref(group.kind, q)}>Ver todos os {group.total}</ArrowLink>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </>
  )
}
