import { ButtonLink } from '@portal/ui/button'
import { cn } from '@portal/ui/cn'
import { IconArrowRight, IconDoc, IconPlay } from '@portal/ui/icons'
import { Chip } from '@portal/ui/tag'
import Link from 'next/link'
import type { DemoWorkflow } from '@/demo/workflows'
import { librarySlug } from '@/demo/library'
import { CONTINUE, type Resolved, type WorkflowNode } from '@/lib/workflow'

const KIND_LABEL: Record<WorkflowNode['type'], string> = {
  pergunta: 'Pergunta',
  orientacao: 'Antes de decidir',
  alerta: 'Atenção',
  conteudo: 'Para aprofundar',
  resultado: 'Caminhos possíveis',
}

function join(base: string, path: string[]) {
  return `${base}${path.length ? `/${path.join('/')}` : ''}`
}

function Deepen({ node }: { node: WorkflowNode }) {
  const items = (node.contents ?? []).map((c) => librarySlug(c.slug)).filter((x) => x !== null)
  if (!items.length) return null
  return (
    <div className="mt-8">
      <p className="eyebrow">Para aprofundar</p>
      <ul className="mt-2 divide-y divide-rule border-y border-rule">
        {items.map((l) => (
          <li key={l.slug}>
            <Link href={`/biblioteca/${l.slug}`} className="group flex items-center gap-4 py-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-ink text-white">
                {l.kind === 'Videoaula' ? <IconPlay size={16} /> : <IconDoc size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold group-hover:underline">{l.title}</span>
                <span className="block text-xs text-muted">
                  {l.teacher} · <span className="num">{l.minutes} min</span>
                </span>
              </span>
              <IconArrowRight size={16} className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function WorkflowPlayer({
  workflow,
  resolved,
  base = `/workflows/${workflow.slug}`,
}: {
  workflow: DemoWorkflow
  resolved: Resolved
  /** Rota base do player (o admin usa a sua própria para pré-visualizar rascunhos). */
  base?: string
}) {
  const { node, trail, path } = resolved
  const href = (_slug: string, p: string[]) => join(base, p)
  const back = path.slice(0, -1)
  const stepNumber = trail.length + 1
  const continueHref = href(workflow.slug, [...path, CONTINUE])

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      {/* Trilha: onde estou e como cheguei aqui */}
      <aside aria-label="Seu raciocínio até aqui" className="order-2 lg:order-1 lg:col-span-4">
        <p className="eyebrow">Seu raciocínio até aqui</p>
        <ol className="mt-3 border-l border-rule">
          {trail.map((t, i) => (
            <li key={t.nodeKey + i} className="relative pb-4 pl-5">
              <span className="absolute top-1.5 -left-[4.5px] size-2 rounded-full bg-ink" />
              <span className="num block text-[11px] text-muted">Etapa {i + 1}</span>
              <span className="block text-sm leading-snug text-ink-2">{t.node.title}</span>
              <span className="mt-0.5 flex items-center gap-2 text-sm font-semibold">
                → {t.choiceLabel}
                <Link href={href(workflow.slug, t.path)} className="text-xs font-normal text-muted underline underline-offset-2 hover:text-ink">
                  mudar
                </Link>
              </span>
            </li>
          ))}
          <li className="relative pl-5">
            <span className="absolute top-1.5 -left-[5.5px] size-2.5 rounded-full bg-brand" />
            <span className="num block text-[11px] font-semibold text-brand">Etapa {stepNumber} · você está aqui</span>
            <span className="block text-sm leading-snug font-semibold">{node.title}</span>
          </li>
        </ol>
        {trail.length ? (
          <Link href={href(workflow.slug, [])} className="mt-6 inline-block text-sm text-muted underline underline-offset-2 hover:text-ink">
            Recomeçar este workflow
          </Link>
        ) : null}
      </aside>

      {/* Etapa atual */}
      <section aria-labelledby="etapa-atual" className="order-1 min-w-0 lg:order-2 lg:col-span-8">
        <div
          className={cn(
            'rounded-lg border bg-surface p-6 sm:p-8',
            node.type === 'alerta' ? 'border-ink border-l-4' : 'border-rule',
          )}
        >
          <p className="eyebrow flex items-center gap-2">
            <span className="num text-brand">{String(stepNumber).padStart(2, '0')}</span>
            {node.type === 'alerta' ? '⚠ ' : ''}
            {KIND_LABEL[node.type]}
          </p>
          <h2 id="etapa-atual" className="mt-3 text-2xl leading-tight font-light tracking-tight text-balance sm:text-[2rem]">
            {node.title}
          </h2>
          {node.body ? <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">{node.body}</p> : null}
          {node.topics?.length ? (
            <p className="mt-4 flex flex-wrap gap-2">
              {node.topics.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </p>
          ) : null}

          {node.type === 'pergunta' ? (
            <ul className="mt-8 grid gap-2 sm:grid-cols-2">
              {node.options.map((o) => (
                <li key={o.key}>
                  <Link
                    href={href(workflow.slug, [...path, o.key])}
                    className="group flex min-h-14 items-center justify-between gap-3 rounded-md border border-rule-strong bg-surface px-4 py-3 text-[15px] font-semibold transition-colors hover:border-ink hover:bg-sunken"
                  >
                    {o.label}
                    <IconArrowRight size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {node.type === 'orientacao' && node.points ? (
            <div className="mt-6">
              <p className="eyebrow">Observe</p>
              <ul className="mt-2 space-y-2">
                {node.points.map((p) => (
                  <li key={p} className="flex gap-3 text-[15px] leading-snug">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 bg-brand" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {node.type === 'resultado' ? (
            <div className="mt-6 space-y-3">
              {node.paths.map((p, i) => (
                <div key={p.name} className="rounded-md border border-rule p-4 sm:p-5">
                  <p className="flex items-baseline gap-2">
                    <span className="num text-sm font-semibold text-muted">{String.fromCharCode(65 + i)}</span>
                    <span className="text-lg font-semibold">{p.name}</span>
                  </p>
                  <p className="eyebrow mt-3 text-[10px]">Critérios que sustentam este caminho</p>
                  <ul className="mt-1.5 space-y-1">
                    {p.criteria.map((c) => (
                      <li key={c} className="flex gap-2 text-sm text-ink-2">
                        <span aria-hidden="true">·</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="pt-2 text-sm leading-relaxed text-ink-2">
                {node.reminder ?? 'Compare os caminhos com as condições reais do paciente.'} A decisão é sua, com o seu supervisor.
              </p>
            </div>
          ) : null}

          <Deepen node={node} />

          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-rule pt-6">
            {node.type !== 'pergunta' && node.type !== 'resultado' ? (
              <ButtonLink href={continueHref}>
                Continuar <IconArrowRight size={16} />
              </ButtonLink>
            ) : null}
            {node.type === 'resultado' ? (
              <>
                <ButtonLink href="/casos/novo">Registrar um caso</ButtonLink>
                <ButtonLink href="/workflows" variant="secondary">
                  Outro workflow
                </ButtonLink>
              </>
            ) : null}
            {trail.length ? (
              <Link href={href(workflow.slug, back)} className="text-sm text-muted hover:text-ink">
                ← Voltar uma etapa
              </Link>
            ) : null}
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          O Workflow clínico é uma ferramenta educacional de apoio ao raciocínio. Ele organiza perguntas e critérios; não substitui a
          avaliação clínica nem a decisão com o seu supervisor.
        </p>
      </section>
    </div>
  )
}
