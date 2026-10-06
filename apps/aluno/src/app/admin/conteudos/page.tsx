import { ButtonLink } from '@portal/ui/button'
import { IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import { StatusPill } from '@portal/ui/tag'
import type { Metadata } from 'next'
import Link from 'next/link'
import { LifecycleTabs } from '@/components/admin/Lifecycle'
import { Poster } from '@/components/library/Poster'
import { adminContents, countBy } from '@/demo/admin-content'

export const metadata: Metadata = { title: 'Aulas e conteúdos' }

export default function AdminContentsPage() {
  return (
    <div data-lc-root="conteudos">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle
          eyebrow="Biblioteca"
          title="Aulas e conteúdos"
          lead="Videoaulas, artigos, livros e PDFs. Só os publicados aparecem na biblioteca, nos módulos e nas recomendações."
        />
        <ButtonLink href="/admin/conteudos" className="mb-8 md:mb-10">
          <IconPlus size={18} /> Nova aula ou conteúdo
        </ButtonLink>
      </div>
      <LifecycleTabs name="conteudos" counts={countBy(adminContents)} />
      <ul className="glass divide-y divide-rule overflow-hidden rounded-2xl">
        {adminContents.map((c) => {
          const preview = c.status === 'publicado' ? `/biblioteca/${c.slug}` : `/admin/conteudos/${c.slug}/previa`
          return (
            <li key={c.slug} data-lifecycle={c.status} className="grid grid-cols-[5.5rem_1fr] items-center gap-4 px-4 py-3 sm:grid-cols-[6.5rem_1fr_8rem_auto]">
              <Poster item={c} className="!rounded-lg [&_.eyebrow]:hidden" />
              <span className="min-w-0">
                <span className={`block truncate text-[15px] font-semibold ${c.status === 'arquivado' ? 'text-muted' : ''}`}>{c.title}</span>
                <span className="block truncate text-xs text-muted">
                  {c.kind} · {c.teacher} · {c.category}
                </span>
              </span>
              <span className="hidden sm:block">
                <StatusPill status={c.status} />
              </span>
              <span className="col-span-2 flex items-center gap-4 text-sm sm:col-span-1">
                <span className="sm:hidden">
                  <StatusPill status={c.status} />
                </span>
                <Link href={preview} className="font-semibold underline-offset-2 hover:underline">
                  {c.status === 'publicado' ? 'Ver como aluno' : 'Pré-visualizar'}
                </Link>
                <span className="text-muted">{c.status === 'arquivado' ? 'Restaurar' : c.status === 'rascunho' ? 'Publicar' : 'Arquivar'}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
