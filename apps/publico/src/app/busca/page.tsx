import type { Metadata } from 'next'
import { Activate } from '@/components/Enhancer'
import { SearchBox } from '@/components/search/SearchBox'
import { buildSearchIndex } from '@/lib/search'
import { getDataset } from '@/server/data/repository'

export const metadata: Metadata = { title: 'Busca' }
export const revalidate = 60

/**
 * Busca global. O índice contém só campos públicos que o portal já exibe;
 * a consulta roda no navegador (src/client/search.ts), instantânea e com ?q= na URL.
 */
export default async function SearchPage() {
  const index = buildSearchIndex(await getDataset())
  const example = (q: string) => (
    <a className="link-underline" href={`/busca?q=${encodeURIComponent(q)}`} data-search-example={q}>
      {q}
    </a>
  )

  return (
    <div data-search="">
      <script type="application/json" data-search-index="" dangerouslySetInnerHTML={{ __html: JSON.stringify(index) }} />
      <div className="pt-8 pb-8 md:pt-14">
        <h1 className="mb-3 font-display text-[1.9rem] leading-tight md:text-[2.6rem]">O que você procura?</h1>
        <SearchBox id="busca-global" mode="search" placeholder="Professor, módulo, tema, material…" label="Buscar no portal" size="lg" />
        <p data-search-count="" hidden className="data mt-3 text-xs text-muted" aria-live="polite" />
      </div>
      <p data-search-hint="" className="text-muted">
        Busque pelo nome de um professor, número do módulo (ex.: {example('módulo 3')}), tema (ex.: {example('resina')}) ou
        material.
      </p>
      <div data-search-results="" className="space-y-12" />
      <Activate />
    </div>
  )
}
