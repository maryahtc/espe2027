import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ContentGrid } from '@/components/library/ContentCard'
import { currentCohort } from '@/lib/academic/load'
import { requireUser } from '@/lib/auth/session'
import { loadLibrary, loadTaxonomy } from '@/lib/library/load'
import { guardStudentPage } from '@/lib/simulation/guard'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { topics } = await loadTaxonomy(true)
  return { title: topics.find((t) => t.slug === slug)?.name ?? 'Tema' }
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  await guardStudentPage()
  const { slug } = await params
  const auth = await requireUser()
  const [{ categories, topics }, cohort] = await Promise.all([loadTaxonomy(true), currentCohort()])
  const topic = topics.find((t) => t.slug === slug)
  if (!topic) notFound()
  // Tema juntado a outro: leva para o tema que ficou.
  if (topic.archived) {
    const target = topic.mergedInto ? topics.find((t) => t.id === topic.mergedInto && !t.archived) : null
    if (target) redirect(`/biblioteca/temas/${target.slug}`)
    notFound()
  }
  const all = await loadLibrary(auth?.userId ?? null, cohort?.id ?? null)
  const items = all.filter((c) => c.topics.some((t) => t.id === topic.id))
  const area = categories.find((c) => c.id === topic.categoryId)
  return (
    <>
      <Link href="/biblioteca/temas" className="text-sm text-muted hover:text-ink">
        ← Temas
      </Link>
      <PageTitle eyebrow={area?.name ?? 'Tema'} title={topic.name} lead={topic.description ?? undefined} />
      {items.length ? (
        <section aria-label="Conteúdos do tema">
          <p className="eyebrow">
            {items.length} {items.length === 1 ? 'conteúdo' : 'conteúdos'}
          </p>
          <ContentGrid items={items} />
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-rule-strong px-6 py-10 text-center text-sm text-muted">Ainda não há conteúdos neste tema.</p>
      )}
    </>
  )
}
