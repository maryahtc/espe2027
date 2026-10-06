import { ButtonLink } from '@portal/ui/button'
import { cn } from '@portal/ui/cn'
import { IconArrowRight, IconDoc, IconPlay } from '@portal/ui/icons'
import { Chip } from '@portal/ui/tag'
import Link from 'next/link'
import { librarySlug } from '@/demo/library'
import type { DemoWorkflow } from '@/demo/workflows'
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

/** Trecho de linha vertical entre nós. Percorrido = vermelho; à frente = cinza. */
function Connector({ active, label }: { active: boolean; label?: string }) {
  return (
    <div className="relative ml-[22px] flex min-h-10 items-center pl-6">
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-0 bottom-0 left-0 w-[2px] -translate-x-1/2 rounded-full',
          active ? 'bg-brand shadow-[0_0_10px_var(--brand-glow)]' : 'bg-white/10',
        )}
      />
      {label ? <span className="text-xs font-semibold tracking-wide text-signal">→ {label}</span> : null}
    </div>
  )
}

function Deepen({ node }: { node: WorkflowNode }) {
  const items = (node.contents ?? []).map((c) => librarySlug(c.slug)).filter((x) => x !== null)
  if (!items.length) return null
  return (
    <div>
      <p className="eyebrow">Para aprofundar</p>
      <ul className="mt-3 space-y-2">
        {items.map((l) => (
          <li key={l.slug}>
            <Link href={`/biblioteca/${l.slug}`} className="group flex items-center gap-3 rounded-xl p-2 -mx-2 transition-colors hover:bg-white/[0.05]">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-black ring-1 ring-white/10">
                {l.kind === 'Videoaula' ? <IconPlay size={16} /> : <IconDoc size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold group-hover:underline">{l.title}</span>
                <span className="block text-xs text-muted">
                  {l.teacher} · <span className="num">{l.minutes} min</span>
                </span>
              </span>
              <IconArrowRight size={15} className="shrink-0 text-faint group-hover:text-ink" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Player do workflow: à esquerda, o "mapa" do raciocínio — nós de vidro ligados por linhas finas; o caminho já
 * escolhido acende em vermelho e as respostas possíveis ficam em cinza. À direita, um painel contextual com o
 * que considerar e o que estudar naquele ponto.
 */
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
  const href = (p: string[]) => join(base, p)
  const stepNumber = trail.length + 1
  const hasContext = node.type === 'orientacao' || node.type === 'alerta' || !!node.contents?.length || !!node.topics?.length

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Mapa do raciocínio */}
      <section aria-label="Seu raciocínio" className="min-w-0 lg:col-span-7">
        <ol>
          {trail.map((t, i) => (
            <li key={t.nodeKey + i}>
              <Link
                href={href(t.path)}
                className="glass glass-interactive group flex items-center gap-4 rounded-2xl px-4 py-3"
                title="Voltar para esta etapa"
              >
                <span className="flex size-[28px] shrink-0 items-center justify-center rounded-full border border-[rgba(202,44,44,0.6)] bg-brand-tint">
                  <span className="size-1.5 rounded-full bg-brand" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="num block text-[11px] text-muted">Etapa {i + 1}</span>
                  <span className="block truncate text-sm text-ink-2">{t.node.title}</span>
                </span>
                <span className="shrink-0 text-xs text-faint opacity-0 transition-opacity group-hover:opacity-100">mudar</span>
              </Link>
              <Connector active label={t.choiceLabel !== 'Continuar' ? t.choiceLabel : undefined} />
            </li>
          ))}

          {/* Etapa atual */}
          <li>
            <div
              className={cn(
                'glass glass-sheen is-selected relative rounded-[22px] p-6 sm:p-8',
                node.type === 'alerta' && 'border-l-4',
              )}
            >
              <p className="eyebrow flex items-center gap-2.5">
                <span className="glow-dot" />
                <span className="num text-signal">{String(stepNumber).padStart(2, '0')}</span>
                {node.type === 'alerta' ? '⚠ ' : ''}
                {KIND_LABEL[node.type]}
              </p>
              <h2 className="mt-4 text-[1.7rem] leading-[1.12] font-light tracking-tight text-balance sm:text-[2.2rem]">{node.title}</h2>
              {node.body && node.type !== 'orientacao' ? (
                <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-ink-2">{node.body}</p>
              ) : null}

              {node.type !== 'pergunta' && node.type !== 'resultado' ? (
                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <ButtonLink href={href([...path, CONTINUE])}>
                    Continuar <IconArrowRight size={16} />
                  </ButtonLink>
                </div>
              ) : null}
            </div>

            {/* Respostas possíveis: ramificações em cinza */}
            {node.type === 'pergunta' ? (
              <div className="relative mt-0">
                <div className="ml-[22px] h-6 w-[2px] -translate-x-1/2 bg-white/10" aria-hidden="true" />
                <ul className="relative grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-2">
                  {node.options.map((o) => (
                    <li key={o.key} className="relative">
                      <Link
                        href={href([...path, o.key])}
                        className="glass glass-interactive group flex min-h-14 items-center justify-between gap-3 rounded-2xl px-5 py-3 text-[15px] font-semibold"
                      >
                        <span className="flex items-center gap-3">
                          <span className="size-2 rounded-full border border-white/30 transition-colors group-hover:border-[var(--brand)] group-hover:bg-brand" />
                          {o.label}
                        </span>
                        <IconArrowRight size={16} className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Resultado: caminhos possíveis lado a lado */}
            {node.type === 'resultado' ? (
              <div>
                <div className="ml-[22px] h-6 w-[2px] -translate-x-1/2 bg-white/10" aria-hidden="true" />
                <ul className={cn('grid gap-3 border-t border-white/10 pt-4', node.paths.length > 1 && 'sm:grid-cols-2')}>
                  {node.paths.map((p, i) => (
                    <li key={p.name} className="glass rounded-2xl p-5">
                      <p className="flex items-baseline gap-2.5">
                        <span className="num text-sm font-semibold text-signal">{String.fromCharCode(65 + i)}</span>
                        <span className="text-[17px] leading-snug font-semibold">{p.name}</span>
                      </p>
                      <p className="eyebrow mt-4 text-[10px]">Critérios que sustentam</p>
                      <ul className="mt-2 space-y-1.5">
                        {p.criteria.map((c) => (
                          <li key={c} className="flex gap-2.5 text-sm leading-snug text-ink-2">
                            <span aria-hidden="true" className="mt-[7px] size-1 shrink-0 rounded-full bg-white/40" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 max-w-[60ch] text-sm leading-relaxed text-ink-2">
                  {node.reminder ?? 'Compare os caminhos com as condições reais do paciente.'} A decisão é sua, com o seu supervisor.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <ButtonLink href="/casos/novo">Registrar um caso</ButtonLink>
                  <ButtonLink href="/workflows" variant="secondary">
                    Outro workflow
                  </ButtonLink>
                </div>
              </div>
            ) : null}
          </li>
        </ol>

        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {trail.length ? (
            <>
              <Link href={href(path.slice(0, -1))} className="text-muted hover:text-ink">
                ← Voltar uma etapa
              </Link>
              <Link href={href([])} className="text-muted hover:text-ink">
                Recomeçar
              </Link>
            </>
          ) : null}
        </div>
      </section>

      {/* Painel contextual */}
      <aside aria-label="Painel contextual" className="lg:col-span-5">
        <div className="glass space-y-7 rounded-[22px] p-6 lg:sticky lg:top-8 sm:p-7">
          {node.type === 'orientacao' ? (
            <div>
              <p className="eyebrow">Antes de decidir, considere</p>
              {node.body ? <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{node.body}</p> : null}
              {node.points ? (
                <ul className="mt-4 space-y-3">
                  {node.points.map((p) => (
                    <li key={p} className="flex gap-3 text-[15px] leading-snug">
                      <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand" />
                      {p}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {node.type === 'alerta' ? (
            <div>
              <p className="eyebrow text-signal">⚠ Atenção</p>
              <p className="mt-3 text-[15px] leading-relaxed">{node.body}</p>
            </div>
          ) : null}

          {!hasContext ? (
            <div>
              <p className="eyebrow">Como usar</p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
                {node.type === 'resultado'
                  ? 'Cada caminho traz os critérios que o sustentam. Compare-os com o seu paciente e discuta com o supervisor.'
                  : 'Escolha a resposta que melhor descreve o caso. O caminho que você percorre fica marcado em vermelho e pode ser mudado a qualquer momento.'}
              </p>
            </div>
          ) : null}

          {node.topics?.length ? (
            <div>
              <p className="eyebrow">Temas desta etapa</p>
              <p className="mt-3 flex flex-wrap gap-2">
                {node.topics.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </p>
            </div>
          ) : null}

          <Deepen node={node} />

          <p className="border-t border-rule pt-5 text-xs leading-relaxed text-muted">
            O Workflow clínico é uma ferramenta educacional de apoio ao raciocínio. Ele organiza perguntas e critérios; não
            substitui a avaliação clínica nem a decisão com o seu supervisor. · {workflow.title}
          </p>
        </div>
      </aside>
    </div>
  )
}
