import { ButtonLink } from '@portal/ui/button'
import { cn } from '@portal/ui/cn'
import { PageTitle } from '@portal/ui/section'
import Link from 'next/link'
import { moveWorkflow } from '@/lib/workflows/actions'
import type { WfListItem } from '@/lib/workflows/load'
import { formatDate, groupByCategory, searchWorkflows, STATUS_LABEL, type WorkflowStatus } from '@/lib/workflows/model'
import { MoveButtons } from './WfButton'

const FILTERS: Array<[string, string]> = [
  ['', 'Todos'],
  ['rascunho', 'Rascunho'],
  ['publicado', 'Publicado'],
  ['arquivado', 'Arquivado'],
]

export function StatusPill({ status }: { status: WorkflowStatus }) {
  return (
    <span data-status={status} className="inline-flex items-center gap-1.5 text-xs font-semibold">
      <span className={cn('size-2 rounded-full', status === 'publicado' ? 'bg-ink' : status === 'rascunho' ? 'border border-ink' : 'border border-dashed border-muted')} />
      <span className={status === 'arquivado' ? 'text-muted' : undefined}>{STATUS_LABEL[status]}</span>
    </span>
  )
}

/** Lista do editor (Admin e Coordenação): agrupada pelas categorias do catálogo, com busca simples e ↑ ↓. */
export function WorkflowListView({
  base,
  eyebrow,
  list,
  query,
  status,
  deleted,
}: {
  base: string
  eyebrow: string
  list: WfListItem[]
  query: string
  status: string
  deleted: boolean
}) {
  const filtered = searchWorkflows(list, query).filter((w) => !status || w.status === status)
  const filtering = !!query || !!status
  const groups = groupByCategory(filtered)
  // ↑ ↓ comparam com a categoria inteira (não com a lista filtrada).
  const fullGroups = new Map(groupByCategory(list).map((g) => [g.category, g.items.map((w) => w.id)]))

  return (
    <div data-workflows-editor>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle
          eyebrow={eyebrow}
          title="Workflows clínicos"
          lead="Referências de consulta rápida: como executar cada procedimento, o que separar e o que vem depois. Só os publicados (de procedimento ativo) chegam aos alunos."
        />
        <ButtonLink href={`${base}/novo`} className="mb-8 md:mb-10">
          + Novo workflow
        </ButtonLink>
      </div>

      {deleted ? (
        <p role="status" className="mb-6 text-sm text-muted">
          ✓ Rascunho excluído.
        </p>
      ) : null}

      {list.length ? (
        <form method="get" className="mb-8 flex flex-wrap items-center gap-3" role="search">
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por procedimento, sinônimo ou categoria"
            aria-label="Buscar workflow"
            className="field min-h-11 w-full min-w-0 px-3 text-[15px] sm:w-80"
          />
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <span className="flex flex-wrap gap-2 text-sm">
            {FILTERS.map(([v, label]) => (
              <Link
                key={v || 'todos'}
                href={`${base}?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(v ? { status: v } : {}) }).toString()}`}
                aria-current={status === v ? 'true' : undefined}
                className={cn('inline-flex min-h-11 items-center rounded-full border px-4', status === v ? 'border-rule-strong font-semibold text-ink' : 'border-rule text-muted hover:text-ink')}
              >
                {label}
              </Link>
            ))}
          </span>
        </form>
      ) : null}

      {!list.length ? (
        <div className="glass rounded-2xl p-6 text-sm text-ink-2" data-vazio>
          Nenhum workflow ainda. Comece por <strong>+ Novo workflow</strong> e escolha um procedimento do catálogo.
        </div>
      ) : !filtered.length ? (
        <p className="text-sm text-muted" data-sem-resultado>
          Nenhum workflow encontrado{query ? ` para “${query}”` : ''}.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => {
            const ids = fullGroups.get(g.category) ?? []
            return (
              <section key={g.category} aria-label={g.category} data-categoria={g.category}>
                <h2 className="eyebrow mb-3">{g.category}</h2>
                <ul className="divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-surface">
                  {g.items.map((w) => {
                    const i = ids.indexOf(w.id)
                    return (
                      <li key={w.id} data-workflow={w.procedureSlug} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                        <Link href={`${base}/${w.id}`} className="group min-w-0 flex-1 basis-60">
                          <span className="block font-semibold group-hover:underline">{w.procedureName}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                            <StatusPill status={w.status} />
                            <span className="num">
                              {w.stageCount} {w.stageCount === 1 ? 'etapa' : 'etapas'}
                            </span>
                            <span>
                              Atualizado em {formatDate(w.updatedAt)}
                              {w.updatedByName ? ` · por ${w.updatedByName}` : ''}
                            </span>
                            {!w.procedureActive ? (
                              <span data-aviso-desativado className="font-semibold text-ink-2">
                                · Procedimento desativado no catálogo
                              </span>
                            ) : null}
                          </span>
                        </Link>
                        {!filtering && ids.length > 1 ? <MoveButtons action={moveWorkflow} id={w.id} first={i === 0} last={i === ids.length - 1} name={w.procedureName} /> : null}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
