import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { currentCohort } from '@/lib/academic/load'
import { requireUser } from '@/lib/auth/session'
import { loadLibrary, loadTaxonomy } from '@/lib/library/load'

export const metadata: Metadata = { title: 'Temas' }

export default async function TopicsPage() {
  const auth = await requireUser()
  const cohort = await currentCohort()
  const [{ categories, topics }, all] = await Promise.all([loadTaxonomy(), loadLibrary(auth?.userId ?? null, cohort?.id ?? null)])
  const count = new Map<string, number>()
  for (const c of all) for (const t of c.topics) count.set(t.id, (count.get(t.id) ?? 0) + 1)
  return (
    <>
      <Link href="/biblioteca" className="text-sm text-muted hover:text-ink">
        ← Biblioteca
      </Link>
      <PageTitle eyebrow="Biblioteca" title="Temas" lead="Os assuntos da especialização, organizados por área. Cada tema reúne os conteúdos ligados a ele." />
      <div className="grid gap-10 md:grid-cols-2">
        {categories.map((cat) => {
          const list = topics.filter((t) => t.categoryId === cat.id)
          if (!list.length) return null
          return (
            <section key={cat.id} aria-labelledby={`area-${cat.slug}`}>
              <h2 id={`area-${cat.slug}`} className="eyebrow">
                {cat.name}
              </h2>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {list.map((t) => (
                  <li key={t.id}>
                    <Link href={`/biblioteca/temas/${t.slug}`} className="flex items-baseline justify-between gap-4 py-3 text-sm hover:underline">
                      <span>{t.name}</span>
                      <span className="num shrink-0 text-xs text-muted">{count.get(t.id) ?? 0}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}
