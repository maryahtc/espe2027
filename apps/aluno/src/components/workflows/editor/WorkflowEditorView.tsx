import Link from 'next/link'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { AddPanel, Block, Input, inputCls, labelCls, TextArea } from '@/components/admin/academic/ui'
import { addStage, deleteWorkflow, moveStage, saveWorkflow, setWorkflowStatus } from '@/lib/workflows/actions'
import type { WfEditor } from '@/lib/workflows/load'
import { formatDate, publishIssues, stageSections, WORKFLOW_LIMITS } from '@/lib/workflows/model'
import { MoveButtons, WfButton } from './WfButton'
import { StatusPill } from './WorkflowListView'

export const two = (n: number) => String(n).padStart(2, '0')

/** Cabeçalho comum (workflow e etapa): nome e categoria do catálogo, status, última atualização e avisos. */
export function WorkflowHeader({ w, title, eyebrow }: { w: WfEditor; title: string; eyebrow: string }) {
  return (
    <header className="mt-4 mb-8">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-1 text-3xl leading-tight font-light tracking-tight break-words sm:text-4xl">{title}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <StatusPill status={w.status} />
        <span data-ultima-atualizacao>
          Última atualização: {formatDate(w.updatedAt)}
          {w.updatedByName ? ` · por ${w.updatedByName}` : ''}
        </span>
      </p>
      {!w.procedureActive ? (
        <p role="note" data-aviso-desativado className="mt-4 rounded-2xl border border-rule-strong px-4 py-3 text-sm text-ink-2">
          <strong className="text-ink">Procedimento desativado no catálogo.</strong> Este workflow não aparece para os alunos enquanto o procedimento estiver
          inativo. Nada foi apagado nem despublicado; se o procedimento for reativado, ele volta a aparecer.
        </p>
      ) : null}
      {w.status === 'publicado' ? <p className="mt-3 text-xs text-muted">Publicado: as alterações valem na hora para os alunos.</p> : null}
    </header>
  )
}

/** Workflow: descrição, etapas (↑ ↓), adicionar etapa e publicação. */
export function WorkflowEditorView({ base, eyebrow, w, flash }: { base: string; eyebrow: string; w: WfEditor; flash: string | null }) {
  const issues = publishIssues(w)
  const published = w.status === 'publicado'
  return (
    <div data-editor-workflow={w.procedureSlug}>
      <Link href={base} className="text-sm text-muted hover:text-ink">
        ← Workflows clínicos
      </Link>
      <WorkflowHeader w={w} title={w.procedureName} eyebrow={`${eyebrow} · ${w.categoryName}`} />
      {flash ? (
        <p role="status" className="mb-6 text-sm text-muted">
          ✓ {flash}
        </p>
      ) : null}

      <Block index="01" title="Descrição curta" hint="Opcional. Nome e categoria vêm do catálogo.">
        <ActionForm action={saveWorkflow} submit="Salvar descrição">
          <input type="hidden" name="id" value={w.id} />
          <TextArea label="Descrição curta" name="descricao" defaultValue={w.summary ?? ''} maxLength={WORKFLOW_LIMITS.summary} rows={2} hint={`Até ${WORKFLOW_LIMITS.summary} caracteres.`} />
        </ActionForm>
      </Block>

      <Block index="02" title="Etapas clínicas" hint="Etapas do procedimento, não necessariamente consultas. Abra uma etapa para editar o conteúdo dela.">
        {w.stages.length ? (
          <ol className="mb-4 divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-surface" data-etapas>
            {w.stages.map((s, i) => {
              const sec = stageSections(s)
              return (
                <li key={s.id} data-etapa={s.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <Link href={`${base}/${w.id}/etapas/${s.id}`} className="group flex min-w-0 flex-1 basis-56 items-baseline gap-3">
                    <span className="num text-sm text-muted">{two(i + 1)}</span>
                    <span className="min-w-0">
                      <span className="block font-semibold break-words group-hover:underline">{s.name}</span>
                      {!sec.passo.length ? (
                        <span data-sem-passo className="block text-xs font-semibold text-ink-2">
                          Sem passo a passo
                        </span>
                      ) : null}
                    </span>
                  </Link>
                  <MoveButtons action={moveStage} id={s.id} first={i === 0} last={i === w.stages.length - 1} name={s.name} />
                </li>
              )
            })}
          </ol>
        ) : (
          <p className="mb-4 text-sm text-muted" data-sem-etapas>
            Nenhuma etapa ainda.
          </p>
        )}
        {w.stages.length < WORKFLOW_LIMITS.stages ? (
          <AddPanel label="Adicionar etapa">
            <ActionForm action={addStage} submit="Adicionar etapa">
              <input type="hidden" name="workflow" value={w.id} />
              <input type="hidden" name="base" value={base} />
              <Input label="Nome da etapa" name="nome" required maxLength={WORKFLOW_LIMITS.stageName} placeholder="Ex.: Planejamento, Preparo, Prova…" />
              <CatalogStepSelect steps={w.catalogSteps} value={null} />
              <Input
                label={published ? 'Primeiro passo (obrigatório em workflow publicado)' : 'Primeiro passo (opcional)'}
                name="primeiro_passo"
                required={published}
                maxLength={WORKFLOW_LIMITS.text}
              />
            </ActionForm>
          </AddPanel>
        ) : (
          <p className="text-xs text-muted">Limite de {WORKFLOW_LIMITS.stages} etapas atingido.</p>
        )}
      </Block>

      <Block index="03" title="Publicação">
        {w.status !== 'arquivado' && issues.length && !published ? (
          <div role="note" data-pendencias className="mb-4 rounded-2xl border border-rule-strong px-4 py-3 text-sm">
            <p className="font-semibold">Para publicar, falta:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-2">
              {issues.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {w.status === 'rascunho' ? (
            <WfButton action={setWorkflowStatus} fields={{ id: w.id, para: 'publicar' }} label="Publicar" data="publicar" variant="primary" disabled={issues.length > 0} />
          ) : null}
          {published ? (
            <WfButton
              action={setWorkflowStatus}
              fields={{ id: w.id, para: 'despublicar' }}
              label="Despublicar"
              data="despublicar"
              variant="secondary"
              confirmText="Despublicar? O workflow volta para rascunho e sai da vista dos alunos."
            />
          ) : null}
          {w.status !== 'arquivado' ? (
            <WfButton
              action={setWorkflowStatus}
              fields={{ id: w.id, para: 'arquivar' }}
              label="Arquivar"
              data="arquivar"
              confirmText="Arquivar este workflow? Ele sai da vista dos alunos e libera o procedimento para um novo workflow. Pode ser restaurado como rascunho."
            />
          ) : (
            <WfButton action={setWorkflowStatus} fields={{ id: w.id, para: 'restaurar' }} label="Restaurar como rascunho" data="restaurar" variant="secondary" />
          )}
          {w.status === 'rascunho' && !w.publishedAt ? (
            <WfButton
              action={deleteWorkflow}
              fields={{ id: w.id, base }}
              label="Excluir rascunho"
              data="excluir-workflow"
              variant="danger"
              confirmText="Excluir este rascunho com todas as etapas? Não dá para desfazer."
            />
          ) : null}
          <span className="inline-flex min-h-11 items-center gap-2 text-sm text-muted" data-ver-como-aluno>
            <span aria-disabled="true" className="cursor-not-allowed font-semibold opacity-50">
              Ver como aluno
            </span>
            <span className="text-xs">· disponível quando a tela do aluno for liberada</span>
          </span>
        </div>
        {w.publishedAt && w.status === 'rascunho' ? <p className="mt-3 text-xs text-muted">Já foi publicado antes: não pode ser excluído, só arquivado.</p> : null}
      </Block>
    </div>
  )
}

/** Etapa equivalente do catálogo (opcional): só para navegação contextual futura a partir do Planejamento. */
export function CatalogStepSelect({ steps, value }: { steps: WfEditor['catalogSteps']; value: string | null }) {
  return (
    <label className={labelCls}>
      Etapa equivalente do catálogo (opcional)
      <select name="etapa_catalogo" defaultValue={value ?? ''} className={inputCls} data-campo="etapa-catalogo">
        <option value="">— Nenhuma —</option>
        {steps.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.active ? '' : ' (desativada no catálogo)'}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs font-normal text-muted">
        Só uma ligação para, no futuro, abrir esta etapa a partir do Planejamento do caso. Não muda o catálogo nem a produção.
      </span>
    </label>
  )
}
