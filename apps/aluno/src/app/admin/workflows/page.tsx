import { ButtonLink } from '@portal/ui/button'
import { IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { draftWorkflow, workflows } from '@/demo/workflows'

export const metadata: Metadata = { title: 'Workflows clínicos' }

export default function AdminWorkflowsPage() {
  const all = [...workflows, draftWorkflow]
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle
          eyebrow="Clínica"
          title="Workflows clínicos"
          lead="Árvores de raciocínio que os alunos usam. Só os publicados aparecem para eles."
        />
        <ButtonLink href="/admin/workflows/novo" className="mb-8 md:mb-10">
          <IconPlus size={18} /> Novo workflow
        </ButtonLink>
      </div>
      <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule bg-surface">
        {all.map((w) => (
          <li key={w.slug}>
            <Link
              href={w.slug === draftWorkflow.slug ? '/admin/workflows/novo' : `/admin/workflows/${w.slug}`}
              className="grid gap-2 px-5 py-4 hover:bg-sunken sm:grid-cols-[1fr_9rem_8rem_7rem] sm:items-center sm:gap-4"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold">{w.title}</span>
                <span className="block truncate text-xs text-muted">{w.summary}</span>
              </span>
              <span className="text-sm text-ink-2">{w.category}</span>
              <span className="num text-sm text-muted">{Object.keys(w.graph.nodes).length} etapas</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                <span className={`size-2 rounded-full ${w.status === 'Publicado' ? 'bg-ink' : 'border border-ink'}`} />
                {w.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
