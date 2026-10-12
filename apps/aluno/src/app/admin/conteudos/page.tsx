import { ButtonLink } from '@portal/ui/button'
import { IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import { StatusPill } from '@portal/ui/tag'
import type { Metadata } from 'next'
import Link from 'next/link'
import { LifecycleTabs } from '@/components/admin/Lifecycle'
import { posterOf, releaseLabel } from '@/components/library/ContentCard'
import { Poster } from '@/components/library/Poster'
import { requireUser } from '@/lib/auth/session'
import { adminContents } from '@/lib/admin/library'
import { KIND_LABEL } from '@/lib/library/model'

export const metadata: Metadata = { title: 'Aulas e conteúdos' }

export default async function AdminContentsPage() {
  await requireUser(['admin'])
  const contents = await adminContents()
  const counts = { rascunho: 0, publicado: 0, arquivado: 0 }
  for (const c of contents) counts[c.status] += 1
  return (
    <div data-lc-root="conteudos">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle
          eyebrow="Biblioteca"
          title="Aulas e conteúdos"
          lead="Videoaulas, artigos, livros, PDFs e links. Só os publicados aparecem na biblioteca e nos módulos. Disponíveis para todas as turmas, salvo restrição."
        />
        <ButtonLink href="/admin/conteudos/novo" className="mb-8 md:mb-10">
          <IconPlus size={18} /> Nova aula ou conteúdo
        </ButtonLink>
      </div>
      <LifecycleTabs name="conteudos" counts={counts} />
      {contents.length ? (
        <ul className="glass divide-y divide-rule overflow-hidden rounded-2xl">
          {contents.map((c) => {
            const release = releaseLabel(c)
            return (
              <li key={c.id} data-lifecycle={c.status}>
                <Link href={`/admin/conteudos/${c.id}`} className="grid grid-cols-[6rem_1fr] items-center gap-4 px-4 py-3 hover:bg-white/[0.04] sm:grid-cols-[7rem_1fr_auto]">
                  <Poster item={posterOf({ ...c, progress: null })} className="!rounded-lg [&_.eyebrow]:hidden" />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{c.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {KIND_LABEL[c.kind]} · {c.category}
                      {c.topics.length ? ` · ${c.topics.length} ${c.topics.length === 1 ? 'tema' : 'temas'}` : ' · sem tema'}
                      {c.cohortIds.length ? ' · turmas específicas' : ''}
                      {c.modules.length ? ` · ${c.modules.length} ${c.modules.length === 1 ? 'módulo' : 'módulos'}` : ''}
                      {release ? ` · ${release}` : ''}
                    </span>
                  </span>
                  <StatusPill status={c.status} className="col-start-2 justify-self-start sm:col-start-auto" />
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-rule-strong px-6 py-10 text-center text-sm text-muted">Nenhum conteúdo ainda. Comece em “Nova aula ou conteúdo”.</p>
      )}
    </div>
  )
}
