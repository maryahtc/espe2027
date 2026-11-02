import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { guardStudentPage } from '@/lib/simulation/guard'
import { groupByCategory, searchWorkflows } from '@/lib/workflows/model'
import { studentWorkflowList } from '@/lib/workflows/student'

export const metadata: Metadata = { title: 'Workflows clínicos' }

/** Workflows clínicos (Etapa 9): referência de consulta rápida — publicados, de procedimento ativo, por categoria. */
export default async function WorkflowsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  await guardStudentPage({ staffView: true })
  const list = await studentWorkflowList()
  if (!list) notFound() // banco ainda sem a Etapa 9: recurso desligado
  const raw = (await searchParams).q
  const q = (typeof raw === 'string' ? raw : '').trim().slice(0, 80)
  const groups = groupByCategory(searchWorkflows(list, q))

  return (
    <div data-workflows-aluno className="max-w-3xl">
      <PageTitle eyebrow="Clínica" title="Workflows clínicos" lead="Como executar cada procedimento, o que separar e o que vem depois. Para consultar na hora." />

      {list.length ? (
        <form method="get" role="search" className="mb-8">
          <label className="sr-only" htmlFor="busca-workflow">
            Buscar workflow
          </label>
          <input
            id="busca-workflow"
            name="q"
            defaultValue={q}
            placeholder="Buscar por procedimento, sinônimo ou categoria"
            className="field min-h-12 w-full px-4 text-[16px]"
            enterKeyHint="search"
          />
        </form>
      ) : null}

      {!list.length ? (
        <p className="text-[15px] text-ink-2" data-vazio>
          Nenhum workflow publicado ainda.
        </p>
      ) : !groups.length ? (
        <p className="text-[15px] text-ink-2" data-sem-resultado>
          Nenhum workflow encontrado para “{q}”.{' '}
          <Link href="/workflows" className="font-semibold text-ink underline-offset-4 hover:underline">
            Ver todos
          </Link>
        </p>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.category} aria-label={g.category} data-categoria={g.category}>
              <h2 className="eyebrow mb-2">{g.category}</h2>
              <ul className="divide-y divide-rule border-y border-rule">
                {g.items.map((w) => (
                  <li key={w.id} data-workflow={w.slug}>
                    <Link href={`/workflows/${w.slug}`} className="group flex min-h-14 items-center gap-4 py-3.5">
                      <span className="min-w-0 flex-1">
                        <span className="block text-lg leading-snug font-light tracking-tight group-hover:underline">{w.procedureName}</span>
                        {w.summary ? <span className="mt-0.5 block text-sm text-muted">{w.summary}</span> : null}
                      </span>
                      <span className="num shrink-0 text-xs text-muted">
                        {w.stageCount} {w.stageCount === 1 ? 'etapa' : 'etapas'}
                      </span>
                      <span aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
