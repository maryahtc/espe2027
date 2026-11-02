import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NOTICE, WorkflowBack } from '@/components/workflows/student/WorkflowTop'
import { guardStudentPage } from '@/lib/simulation/guard'
import { formatDate, returnCase, withCase } from '@/lib/workflows/model'
import { studentWorkflow } from '@/lib/workflows/student'

type Params = Promise<{ slug: string }>
type Search = Promise<{ caso?: string | string[] }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const w = await studentWorkflow((await params).slug)
  return { title: w ? `${w.procedureName} · Workflow clínico` : 'Workflow clínico' }
}

/** Visão geral: a sequência das etapas clínicas (não são consultas; sem progresso nem etapa "concluída"). */
export default async function WorkflowOverviewPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  await guardStudentPage({ staffView: true })
  const w = await studentWorkflow((await params).slug)
  if (!w) notFound()
  const caseId = returnCase((await searchParams).caso)

  return (
    <div data-workflow-visao={w.slug} className="max-w-3xl">
      <WorkflowBack caseId={caseId} href="/workflows" label="← Workflows clínicos" />
      <header className="mt-4 mb-8">
        <p className="eyebrow">{w.categoryName}</p>
        <h1 className="mt-1 text-3xl leading-tight font-light tracking-tight break-words sm:text-4xl">{w.procedureName}</h1>
        {w.summary ? <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{w.summary}</p> : null}
        <p className="mt-3 text-xs text-muted" data-ultima-atualizacao>
          Última atualização: {formatDate(w.updatedAt)}
        </p>
        <p className="mt-4 border-l-2 border-rule-strong pl-3 text-xs text-muted" data-aviso-referencia>
          {NOTICE}
        </p>
      </header>

      <section aria-labelledby="etapas">
        <h2 id="etapas" className="eyebrow mb-2">
          Etapas clínicas
        </h2>
        {w.stages.length ? (
          <ol className="divide-y divide-rule border-y border-rule" data-etapas>
            {w.stages.map((s, i) => (
              <li key={s.id} data-etapa={s.slug}>
                <Link href={withCase(`/workflows/${w.slug}/${s.slug}`, caseId)} className="group flex min-h-14 items-center gap-4 py-3">
                  <span className="num w-7 shrink-0 text-sm text-muted">{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0 flex-1 text-lg leading-snug font-light tracking-tight break-words group-hover:underline">{s.name}</span>
                  <span aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </div>
  )
}
