import { IconCheck, IconPlus } from '@portal/ui/icons'
import Link from 'next/link'
import { categories, library, librarySlug } from '@/demo/library'
import { stepOrder, validateGraph, type WorkflowGraph, type WorkflowNode } from '@/lib/workflow'
import { ConfirmDialog, LifecycleBar } from './Lifecycle'
import { WorkflowMap } from './WorkflowMap'

const TYPES: Array<[WorkflowNode['type'] | 'referencia' | 'decisao', string, string]> = [
  ['pergunta', 'Pergunta', 'O aluno escolhe uma resposta'],
  ['orientacao', 'Orientação', '"Antes de decidir, observe…"'],
  ['decisao', 'Decisão', 'Compara critérios lado a lado'],
  ['alerta', 'Alerta', 'Um cuidado que não pode passar'],
  ['conteudo', 'Conteúdo', 'Aulas e artigos da biblioteca'],
  ['resultado', 'Resultado', 'Caminhos possíveis e critérios'],
  ['referencia', 'Referência', 'Livro ou artigo citado'],
]

const TYPE_LABEL: Record<WorkflowNode['type'], string> = {
  pergunta: 'Pergunta',
  orientacao: 'Orientação',
  alerta: 'Alerta',
  conteudo: 'Conteúdo',
  resultado: 'Resultado',
}

const input =
  'mt-1.5 block min-h-11 w-full rounded-md border border-rule-strong bg-surface px-3 text-[15px] text-ink focus:border-ink focus:outline-none'
const area =
  'mt-1.5 block w-full rounded-md border border-rule-strong bg-surface px-3 py-2.5 text-[15px] leading-relaxed text-ink focus:border-ink focus:outline-none'
const label = 'block text-sm font-semibold'

type Meta = { name: string; category: string; description: string; status: 'Rascunho' | 'Publicado'; previewHref: string }

function NextSelect({ id, value, order, num, graph, labelText = 'Depois desta etapa, ir para' }: {
  id: string
  value: string
  order: string[]
  num: Map<string, string>
  graph: WorkflowGraph
  labelText?: string
}) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        {labelText}
      </label>
      <select id={id} defaultValue={value} className={input}>
        {order.map((k) => (
          <option key={k} value={k}>
            Etapa {num.get(k)} — {graph.nodes[k]!.title}
          </option>
        ))}
        <option value="__nova">+ Criar nova etapa</option>
      </select>
    </div>
  )
}

function ContentPicker({ id, slugs }: { id: string; slugs: string[] }) {
  return (
    <div>
      <label htmlFor={id} className={label}>
        Conteúdos para aprofundar
      </label>
      <p className="mt-0.5 text-xs text-muted">Só conteúdos que existem na biblioteca podem ser vinculados.</p>
      {slugs.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {slugs.map((s) => {
            const l = librarySlug(s)
            return (
              <li key={s} className="inline-flex items-center gap-2 rounded-full border border-rule-strong bg-surface py-1 pr-2 pl-3 text-sm">
                {l?.title ?? s}
                <span aria-hidden="true" className="text-muted">
                  ×
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
      <input id={id} list="biblioteca-lista" placeholder="Buscar aula ou artigo na biblioteca…" className={input} />
    </div>
  )
}

function StepForm({ k, graph, order, num }: { k: string; graph: WorkflowGraph; order: string[]; num: Map<string, string> }) {
  const n = graph.nodes[k]!
  const id = `etapa-${num.get(k)}`
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-24 glass rounded-2xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-4">
        <h3 id={`${id}-t`} className="flex items-baseline gap-3">
          <span className="num text-2xl font-light text-signal">{num.get(k)}</span>
          <span className="text-sm font-semibold">{TYPE_LABEL[n.type]}</span>
          {k === graph.start ? <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold tracking-wider text-on-ink">INÍCIO</span> : null}
        </h3>
        <span className="flex items-center gap-3 text-xs text-muted">
          <label htmlFor={`${id}-tipo`} className="sr-only">
            Tipo da etapa
          </label>
          <select id={`${id}-tipo`} defaultValue={n.type} className="min-h-9 rounded-md border border-rule-strong bg-surface px-2 text-sm text-ink">
            {Object.entries(TYPE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <span className="underline underline-offset-2">Duplicar</span>
          <span className="underline underline-offset-2">Remover etapa</span>
        </span>
      </header>
      <div className="space-y-5 p-5">
        <div>
          <label htmlFor={`${id}-titulo`} className={label}>
            {n.type === 'pergunta' ? 'Pergunta' : 'Título'}
          </label>
          <input id={`${id}-titulo`} defaultValue={n.title} className={input} />
        </div>
        <div>
          <label htmlFor={`${id}-texto`} className={label}>
            Texto de apoio <span className="font-normal text-muted">(opcional)</span>
          </label>
          <textarea id={`${id}-texto`} rows={2} defaultValue={n.body} className={area} />
        </div>

        {n.type === 'pergunta' ? (
          <fieldset>
            <legend className={label}>Respostas</legend>
            <ul className="mt-2 space-y-2">
              {n.options.map((o, i) => (
                <li key={o.key} className="grid grid-cols-[1fr_auto_1.4fr] items-center gap-2">
                  <label htmlFor={`${id}-r${i}`} className="sr-only">
                    Resposta {i + 1}
                  </label>
                  <input id={`${id}-r${i}`} defaultValue={o.label} className="min-h-11 rounded-md border border-rule-strong bg-surface px-3 text-[15px]" />
                  <span aria-hidden="true" className="text-muted">
                    →
                  </span>
                  <label htmlFor={`${id}-r${i}-dest`} className="sr-only">
                    Destino da resposta {i + 1}
                  </label>
                  <select id={`${id}-r${i}-dest`} defaultValue={o.next} className="min-h-11 min-w-0 rounded-md border border-rule-strong bg-surface px-2 text-sm">
                    {order.map((kk) => (
                      <option key={kk} value={kk}>
                        Etapa {num.get(kk)} — {graph.nodes[kk]!.title}
                      </option>
                    ))}
                    <option value="__nova">+ Criar nova etapa</option>
                  </select>
                </li>
              ))}
            </ul>
            <details className="mt-3">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                <IconPlus size={16} /> Adicionar resposta
              </summary>
              <div className="mt-2 grid grid-cols-[1fr_auto_1.4fr] items-center gap-2">
                <input aria-label="Nova resposta" placeholder="Texto da resposta" className="min-h-11 rounded-md border border-dashed border-rule-strong bg-surface px-3 text-[15px]" />
                <span aria-hidden="true" className="text-muted">
                  →
                </span>
                <select aria-label="Destino da nova resposta" defaultValue="__nova" className="min-h-11 min-w-0 rounded-md border border-dashed border-rule-strong bg-surface px-2 text-sm">
                  <option value="__nova">+ Criar nova etapa</option>
                  {order.map((kk) => (
                    <option key={kk} value={kk}>
                      Etapa {num.get(kk)}
                    </option>
                  ))}
                </select>
              </div>
            </details>
          </fieldset>
        ) : null}

        {n.type === 'orientacao' ? (
          <div>
            <label htmlFor={`${id}-pontos`} className={label}>
              O que observar <span className="font-normal text-muted">(um por linha)</span>
            </label>
            <textarea id={`${id}-pontos`} rows={Math.max(2, n.points?.length ?? 2)} defaultValue={(n.points ?? []).join('\n')} className={area} />
          </div>
        ) : null}

        {n.type === 'resultado' ? (
          <fieldset>
            <legend className={label}>Caminhos possíveis</legend>
            <p className="mt-0.5 text-xs text-muted">Cada caminho com os critérios que o sustentam. Evite apresentar uma resposta única.</p>
            <ul className="mt-2 space-y-3">
              {n.paths.map((p, i) => (
                <li key={p.name} className="rounded-md border border-rule p-3">
                  <input aria-label={`Caminho ${i + 1}`} defaultValue={p.name} className="min-h-10 w-full rounded-md border border-rule-strong bg-surface px-3 text-[15px] font-semibold" />
                  <textarea aria-label={`Critérios do caminho ${i + 1}`} rows={p.criteria.length} defaultValue={p.criteria.join('\n')} className={area} />
                </li>
              ))}
            </ul>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
              <IconPlus size={16} /> Adicionar caminho
            </p>
          </fieldset>
        ) : null}

        {n.type !== 'resultado' && n.type !== 'pergunta' ? (
          <NextSelect id={`${id}-prox`} value={n.next} order={order} num={num} graph={graph} />
        ) : null}

        <ContentPicker id={`${id}-conteudos`} slugs={(n.contents ?? []).map((c) => c.slug)} />

        <div>
          <label htmlFor={`${id}-temas`} className={label}>
            Temas
          </label>
          <input id={`${id}-temas`} defaultValue={(n.topics ?? []).join(', ')} placeholder="Ex.: Substrato escurecido" className={input} />
          <p className="mt-1 text-xs text-muted">O aluno chega direto a esta etapa a partir de aulas e casos com estes temas.</p>
        </div>
      </div>
    </section>
  )
}

export function WorkflowEditor({ graph, meta }: { graph: WorkflowGraph; meta: Meta }) {
  const order = stepOrder(graph)
  const num = new Map(order.map((k, i) => [k, String(i + 1).padStart(2, '0')]))
  const issues = validateGraph(graph, new Set(library.map((l) => l.slug)))

  return (
    <div>
      <datalist id="biblioteca-lista">
        {library.map((l) => (
          <option key={l.slug} value={l.title} />
        ))}
      </datalist>

      <Link href="/admin/workflows" className="text-sm text-muted hover:text-ink">
        ← Workflows clínicos
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4 pb-6">
        <div>
          <p className="eyebrow">Workflow clínico</p>
          <h1 className="mt-1 text-3xl font-light tracking-tight sm:text-4xl">{meta.name}</h1>

        </div>
      </div>

      <div className="sticky top-14 z-20 lg:top-4">
        <LifecycleBar
          status={meta.status === 'Publicado' ? 'publicado' : 'rascunho'}
          previewHref={meta.previewHref}
          edited={meta.status === 'Publicado' ? 'você tem alterações ainda não publicadas' : 'rascunho salvo automaticamente'}
          confirmId={meta.status === 'Publicado' ? 'confirmar-workflow' : undefined}
        />
      </div>
      {meta.status === 'Publicado' ? (
        <ConfirmDialog
          id="confirmar-workflow"
          title="Publicar a nova versão deste workflow?"
          impact={[
            'Alunos que estão no meio do workflow terminam na versão atual; a nova vale a partir do próximo início.',
            'Links de aulas e casos que apontam para etapas deste workflow continuam funcionando.',
            'A versão atual fica guardada no histórico e pode ser restaurada.',
          ]}
          confirmLabel="Publicar nova versão"
        />
      ) : null}

      {/* Informações gerais */}
      <section aria-labelledby="info" className="grid gap-6 border-b border-rule py-8 lg:grid-cols-12">
        <h2 id="info" className="eyebrow lg:col-span-3 lg:pt-2">
          Informações
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:col-span-9">
          <div className="sm:col-span-2">
            <label htmlFor="wf-nome" className={label}>
              Nome
            </label>
            <input id="wf-nome" defaultValue={meta.name} className={input} />
          </div>
          <div>
            <label htmlFor="wf-categoria" className={label}>
              Categoria
            </label>
            <select id="wf-categoria" defaultValue={meta.category} className={input}>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="wf-status" className={label}>
              Status
            </label>
            <select id="wf-status" defaultValue={meta.status} className={input}>
              <option>Rascunho</option>
              <option>Publicado</option>
              <option>Arquivado</option>
            </select>
            <p className="mt-1 text-xs text-muted">Só workflows publicados aparecem para os alunos.</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="wf-descricao" className={label}>
              Descrição para o aluno
            </label>
            <textarea id="wf-descricao" rows={2} defaultValue={meta.description} className={area} />
          </div>
        </div>
      </section>

      {/* Verificação antes de publicar */}
      <section aria-labelledby="verificacao" className="py-6">
        <h2 id="verificacao" className="sr-only">
          Verificação
        </h2>
        {issues.length ? (
          <div className="rounded-md border border-danger bg-danger-bg p-4 text-sm">
            <p className="font-semibold text-danger">⚠ Antes de publicar, resolva:</p>
            <ul className="mt-1.5 space-y-1">
              {issues.map((i, n) => (
                <li key={n}>
                  {i.nodeKey ? (
                    <a href={`#etapa-${num.get(i.nodeKey)}`} className="font-semibold underline underline-offset-2">
                      Etapa {num.get(i.nodeKey)}
                    </a>
                  ) : null}{' '}
                  {i.message}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="inline-flex items-center gap-2 rounded-md bg-sunken px-4 py-3 text-sm">
            <IconCheck size={16} /> Tudo certo: todas as etapas são alcançáveis e todo caminho termina em um resultado.
          </p>
        )}
      </section>

      {/* Mapa automático */}
      <section aria-labelledby="mapa" className="pb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="mapa" className="text-2xl font-light tracking-tight">
            Mapa do workflow
          </h2>
          <p className="text-xs text-muted">Gerado automaticamente a partir das etapas. Clique numa caixa para editá-la.</p>
        </div>
        <div className="rule-brand mt-2 mb-4 w-12" />
        <WorkflowMap graph={graph} />
      </section>

      {/* Etapas */}
      <section aria-labelledby="etapas" className="grid gap-8 border-t border-rule pt-8 lg:grid-cols-12">
        <nav aria-label="Etapas" className="lg:col-span-3">
          <h2 id="etapas" className="text-2xl font-light tracking-tight">
            Etapas
          </h2>
          <div className="rule-brand mt-2 w-12" />
          <ol className="mt-4 space-y-1 lg:sticky lg:top-6">
            {order.map((k) => (
              <li key={k}>
                <a href={`#etapa-${num.get(k)}`} className="flex gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sunken">
                  <span className="num w-6 shrink-0 font-semibold text-muted">{num.get(k)}</span>
                  <span className="min-w-0 truncate">{graph.nodes[k]!.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="min-w-0 space-y-5 lg:col-span-9">
          {order.map((k) => (
            <StepForm key={k} k={k} graph={graph} order={order} num={num} />
          ))}

          <details className="group rounded-lg border border-dashed border-rule-strong">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-2 p-5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <IconPlus size={18} /> Adicionar etapa
            </summary>
            <div className="border-t border-rule p-5">
              <p className="text-sm font-semibold">Que tipo de etapa?</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {TYPES.map(([v, l, d]) => (
                  <li key={v} className="glass rounded-2xl p-3 hover:border-rule-strong">
                    <span className="block text-sm font-semibold">{l}</span>
                    <span className="block text-xs text-muted">{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      </section>
    </div>
  )
}
