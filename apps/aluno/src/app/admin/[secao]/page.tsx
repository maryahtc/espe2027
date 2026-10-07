import { ButtonLink } from '@portal/ui/button'
import { EmptyState } from '@portal/ui/empty-state'
import { IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { adminGroups, adminSections } from '@/config/nav'

export function generateStaticParams() {
  return adminSections.filter((s) => !['modulos', 'workflows', 'conteudos', 'avisos', 'alunos', 'equipe', 'turmas'].includes(s.slug)).map((s) => ({ secao: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ secao: string }> }): Promise<Metadata> {
  const { secao } = await params
  const s = adminSections.find((x) => x.slug === secao)
  return { title: s?.label ?? 'Administração' }
}

export default async function AdminSectionPage({ params }: { params: Promise<{ secao: string }> }) {
  const { secao } = await params
  const section = adminSections.find((s) => s.slug === secao)
  if (!section) notFound()
  const group = adminGroups.find((g) => g.sections.includes(section))
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle eyebrow={group?.label} title={section.label} lead={section.summary} />
        {section.action ? (
          <ButtonLink href={`/admin/${section.slug}`} variant="secondary" className="mb-8 md:mb-10">
            <IconPlus size={18} /> {section.action}
          </ButtonLink>
        ) : null}
      </div>
      <EmptyState stage={section.stage} title="O que você vai fazer aqui">
        <ul className="list-disc space-y-1 pl-5">
          {section.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </EmptyState>
    </>
  )
}
