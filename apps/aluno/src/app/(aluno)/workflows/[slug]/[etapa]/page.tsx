import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { MaterialChecklist } from '@/components/workflows/student/MaterialChecklist'
import { NOTICE, WorkflowBack } from '@/components/workflows/student/WorkflowTop'
import { KIND_LABEL } from '@/lib/library/model'
import { guardStudentPage } from '@/lib/simulation/guard'
import { nextSteps, returnCase, stageSections, withCase } from '@/lib/workflows/model'
import { studentWorkflow } from '@/lib/workflows/student'

type Params = Promise<{ slug: string; etapa: string }>
type Search = Promise<{ caso?: string | string[] }>

const two = (n: number) => String(n).padStart(2, '0')

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, etapa } = await params
  const w = await studentWorkflow(slug)
  const s = w?.stages.find((x) => x.slug === etapa)
  return { title: w && s ? `${s.name} · ${w.procedureName}` : 'Workflow clínico' }
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-24 border-t border-rule pt-6 pb-10" data-secao={id}>
      <h2 id={`${id}-titulo`} className="eyebrow mb-4">
        {title}
      </h2>
      {children}
    </section>
  )
}

/**
 * Etapa do workflow: passo a passo, materiais (checklist só na aba), pontos de atenção, próximos passos (só os
 * cadastrados) e conteúdos da Biblioteca que o aluno pode abrir. ← → no fim é só a ordem do workflow.
 */
export default async function WorkflowStagePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  await guardStudentPage({ staffView: true })
  const { slug, etapa } = await params
  const w = await studentWorkflow(slug)
  const index = w ? w.stages.findIndex((s) => s.slug === etapa) : -1
  if (!w || index < 0) notFound()
  const stage = w.stages[index]!
  const caseId = returnCase((await searchParams).caso)
  const sec = stageSections(stage)
  const next = nextSteps(stage, w.stages)
  const prev = w.stages[index - 1]
  const after = w.stages[index + 1]
  const href = (s: { slug: string }) => withCase(`/workflows/${w.slug}/${s.slug}`, caseId)

  const jumps: Array<[string, string]> = [
    ...(sec.passo.length ? [['passo-a-passo', 'Passo a passo'] as [string, string]] : []),
    ...(sec.material.length ? [['materiais', 'Materiais'] as [string, string]] : []),
    ...(sec.atencao.length ? [['atencao', 'Atenção'] as [string, string]] : []),
    ...(next.length ? [['proximos', 'Próximos'] as [string, string]] : []),
  ]

  return (
    <article data-workflow-etapa={stage.slug} className="max-w-3xl">
      <WorkflowBack caseId={caseId} href={withCase(`/workflows/${w.slug}`, caseId)} label={`← ${w.procedureName}`} />
      <header className="mt-4 mb-6">
        <p className="eyebrow">{w.procedureName}</p>
        <h1 className="mt-1 text-3xl leading-tight font-light tracking-tight break-words sm:text-4xl">
          <span className="num text-muted">{two(index + 1)}</span> · {stage.name}
        </h1>
        <p className="mt-2 text-xs text-muted" data-posicao>
          Etapa {index + 1} de {w.stages.length}
        </p>
        {jumps.length > 1 ? (
          <nav aria-label="Seções desta etapa" className="mt-4 flex flex-wrap gap-x-1 gap-y-1 text-sm" data-atalhos>
            {jumps.map(([id, label], i) => (
              <span key={id} className="inline-flex items-center">
                {i ? (
                  <span aria-hidden className="px-1 text-faint">
                    ·
                  </span>
                ) : null}
                <a href={`#${id}`} className="inline-flex min-h-11 items-center px-1 font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                  {label}
                </a>
              </span>
            ))}
          </nav>
        ) : null}
      </header>

      {sec.passo.length ? (
        <Section id="passo-a-passo" title="Passo a passo">
          <ol className="space-y-3">
            {sec.passo.map((p, i) => (
              <li key={p.id} className="flex gap-4 text-[16px] leading-relaxed" data-passo={p.text}>
                <span className="num w-7 shrink-0 pt-0.5 text-sm text-muted" aria-hidden>
                  {two(i + 1)}
                </span>
                <span className="min-w-0 break-words">{p.text}</span>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {sec.material.length ? (
        <Section id="materiais" title="Checklist de materiais">
          <MaterialChecklist stageId={stage.id} items={sec.material.map((m) => ({ id: m.id, text: m.text }))} />
        </Section>
      ) : null}

      {sec.atencao.length ? (
        <Section id="atencao" title="Pontos de atenção">
          <ul className="space-y-2.5">
            {sec.atencao.map((a) => (
              <li key={a.id} className="flex gap-3 border-l-2 border-rule-strong py-0.5 pl-3 text-[15px] leading-relaxed text-ink-2" data-atencao={a.text}>
                <span className="sr-only">Atenção: </span>
                <span className="min-w-0 break-words">{a.text}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Próximos passos: SÓ o que foi cadastrado. Nada é deduzido da ordem das etapas. */}
      {next.length ? (
        <Section id="proximos" title="Próximos passos">
          <ul className="space-y-3">
            {next.map((n) => (
              <li key={n.id} className="text-[16px] leading-relaxed" data-proximo={n.label ?? ''}>
                {n.label ? <span className="font-semibold">{n.label}</span> : null}
                {n.label && n.target ? <span aria-hidden> → </span> : null}
                {n.target ? (
                  <Link href={href(n.target)} className="font-semibold text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink" data-destino={n.target.slug}>
                    {n.label ? '' : '→ '}
                    {n.target.name}
                  </Link>
                ) : null}
                {n.note ? <span className={n.label || n.target ? 'mt-0.5 block text-[15px] text-ink-2' : 'text-ink-2'}>{n.note}</span> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {stage.contents.length ? (
        <Section id="aprofundar" title="Para aprofundar">
          <ul className="space-y-1">
            {stage.contents.map((c) => (
              <li key={c.id} data-conteudo={c.slug}>
                <Link href={`/biblioteca/${c.slug}`} className="group inline-flex min-h-11 flex-wrap items-baseline gap-x-2 py-1">
                  <span className="text-[15px] underline-offset-4 group-hover:underline">{c.title}</span>
                  <span className="text-xs text-muted">{KIND_LABEL[c.kind as keyof typeof KIND_LABEL] ?? c.kind}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Só navegação pela ordem do workflow — não é orientação clínica (essa fica em "Próximos passos"). */}
      <nav aria-label="Ordem das etapas do workflow" className="border-t border-rule pt-4" data-ordem>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          {prev ? (
            <Link href={href(prev)} className="inline-flex min-h-11 items-center text-muted hover:text-ink" data-anterior>
              ← {prev.name}
            </Link>
          ) : (
            <span />
          )}
          {after ? (
            <Link href={href(after)} className="inline-flex min-h-11 items-center text-muted hover:text-ink" data-seguinte>
              {after.name} →
            </Link>
          ) : null}
        </div>
        <p className="mt-1 text-[11px] text-faint">Só a ordem das etapas no workflow — não é orientação de conduta.</p>
      </nav>
      <p className="mt-8 border-l-2 border-rule-strong pl-3 text-xs text-muted">{NOTICE}</p>
    </article>
  )
}
