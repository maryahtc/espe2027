import Link from 'next/link'
import type { ReactNode } from 'react'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { AddPanel, Block, Input, inputCls, labelCls } from '@/components/admin/academic/ui'
import { KIND_LABEL as CONTENT_KIND } from '@/lib/library/model'
import {
  addContent,
  addItem,
  addNext,
  deleteItem,
  deleteNext,
  deleteStage,
  moveContent,
  moveItem,
  moveNext,
  removeContent,
  saveItem,
  saveNext,
  saveStage,
} from '@/lib/workflows/actions'
import type { ContentChoice, WfEditor, WfEditorStage } from '@/lib/workflows/load'
import { stageSections, WORKFLOW_LIMITS, type WorkflowItem, type WorkflowItemKind } from '@/lib/workflows/model'
import { MoveButtons, WfButton } from './WfButton'
import { CatalogStepSelect, two, WorkflowHeader } from './WorkflowEditorView'

const ITEM_BLOCKS: Array<{ kind: WorkflowItemKind; title: string; add: string; hint: string; one: string }> = [
  { kind: 'passo', title: 'Passo a passo', add: 'Adicionar passo', hint: 'Um passo por item, na ordem em que se faz.', one: 'passo' },
  { kind: 'material', title: 'Checklist de materiais', add: 'Adicionar material', hint: 'O □ é só a aparência do item: aqui não existe marcação.', one: 'material' },
  { kind: 'atencao', title: 'Pontos de atenção', add: 'Adicionar ponto de atenção', hint: 'Opcional. Observações curtas e importantes desta etapa.', one: 'ponto de atenção' },
]

/** Linha editável: conteúdo, ↑ ↓, "Editar" (abre o formulário ali mesmo) e "Excluir". */
function Row({ lead, children, move, edit, remove, data }: { lead: ReactNode; children: ReactNode; move: ReactNode; edit: ReactNode; remove: ReactNode; data?: Record<string, string> }) {
  return (
    <li className="px-4 py-3" {...data}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex min-w-0 flex-1 basis-48 items-baseline gap-3">
          <span className="num shrink-0 text-sm text-muted">{lead}</span>
          <span className="min-w-0 text-[15px] break-words">{children}</span>
        </span>
        <span className="flex flex-wrap items-center gap-x-2">
          {move}
          {remove}
        </span>
      </div>
      <details className="group mt-1">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-muted hover:text-ink [&::-webkit-details-marker]:hidden" data-acao="editar">
          <span className="group-open:hidden">Editar</span>
          <span className="hidden group-open:inline">Fechar</span>
        </summary>
        <div className="pb-1">{edit}</div>
      </details>
    </li>
  )
}

function ItemBlock({ index, stage, kind, title, add, hint, one, items }: { index: string; stage: WfEditorStage; items: WorkflowItem[] } & (typeof ITEM_BLOCKS)[number]) {
  return (
    <Block index={index} title={title} hint={hint}>
      <div data-bloco={kind}>
        {items.length ? (
          <ol className="mb-4 divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-surface">
            {items.map((it, i) => (
              <Row
                key={it.id}
                data={{ 'data-item': it.text }}
                lead={kind === 'material' ? '□' : kind === 'atencao' ? '!' : two(i + 1)}
                move={<MoveButtons action={moveItem} id={it.id} first={i === 0} last={i === items.length - 1} name={it.text} />}
                remove={<WfButton action={deleteItem} fields={{ id: it.id }} label="Excluir" ariaLabel={`Excluir ${it.text}`} data="excluir" confirmText={`Excluir “${it.text}”?`} />}
                edit={
                  <ActionForm action={saveItem} row submit="Salvar">
                    <input type="hidden" name="id" value={it.id} />
                    <label className="min-w-0 flex-1 basis-60 text-sm font-semibold">
                      Texto
                      <input name="texto" defaultValue={it.text} required maxLength={WORKFLOW_LIMITS.text} className={inputCls} />
                    </label>
                  </ActionForm>
                }
              >
                {it.text}
              </Row>
            ))}
          </ol>
        ) : (
          <p className="mb-4 text-sm text-muted">{kind === 'atencao' ? 'Nenhum ponto de atenção (tudo bem).' : `Nenhum ${one} ainda.`}</p>
        )}
        {items.length < WORKFLOW_LIMITS.itemsPerKind ? (
          <AddPanel label={add}>
            <ActionForm action={addItem} row submit="Adicionar">
              <input type="hidden" name="etapa" value={stage.id} />
              <input type="hidden" name="tipo" value={kind} />
              <label className="min-w-0 flex-1 basis-60 text-sm font-semibold">
                {one[0]!.toUpperCase() + one.slice(1)}
                <input name="texto" required maxLength={WORKFLOW_LIMITS.text} className={inputCls} />
              </label>
            </ActionForm>
          </AddPanel>
        ) : (
          <p className="text-xs text-muted">Limite de {WORKFLOW_LIMITS.itemsPerKind} itens atingido.</p>
        )}
      </div>
    </Block>
  )
}

function NextFields({ stages, label, target, note }: { stages: WfEditorStage[]; label?: string | null; target?: string | null; note?: string | null }) {
  return (
    <>
      <Input label="Condição (opcional)" name="condicao" defaultValue={label ?? ''} maxLength={WORKFLOW_LIMITS.label} placeholder="Ex.: Aprovado" />
      <label className={labelCls}>
        Destino (opcional)
        <select name="destino" defaultValue={target ?? ''} className={inputCls}>
          <option value="">— Sem destino —</option>
          {stages.map((s, i) => (
            <option key={s.id} value={s.id}>
              {two(i + 1)} {s.name}
            </option>
          ))}
        </select>
      </label>
      <Input label="Orientação (opcional)" name="orientacao" defaultValue={note ?? ''} maxLength={WORKFLOW_LIMITS.note} placeholder="Ex.: Reavaliar antes de prosseguir" />
      <p className="text-xs text-muted">Informe pelo menos um destino ou uma orientação.</p>
    </>
  )
}

/** Etapa: nome e ligação com o catálogo; passo a passo, materiais, atenção, próximos passos e "Para aprofundar". */
export function StageEditorView({
  base,
  eyebrow,
  w,
  stage,
  contents,
  flash,
}: {
  base: string
  eyebrow: string
  w: WfEditor
  stage: WfEditorStage
  contents: ContentChoice[]
  flash: string | null
}) {
  const index = w.stages.findIndex((s) => s.id === stage.id)
  const prev = w.stages[index - 1]
  const next = w.stages[index + 1]
  const sec = stageSections(stage)
  const stageName = new Map(w.stages.map((s) => [s.id, s.name]))
  const linked = new Set(stage.linked.map((l) => l.contentId))
  const choices = contents.filter((c) => !linked.has(c.id))
  const lastPasso = w.status === 'publicado' && sec.passo.length <= 1

  return (
    <div data-editor-etapa={stage.slug}>
      <Link href={`${base}/${w.id}`} className="text-sm text-muted hover:text-ink">
        ← {w.procedureName}
      </Link>
      <WorkflowHeader w={w} title={stage.name} eyebrow={`${eyebrow} · ${w.procedureName} · Etapa ${two(index + 1)} de ${two(w.stages.length)}`} />
      {flash ? (
        <p role="status" className="mb-6 text-sm text-muted">
          ✓ {flash}
        </p>
      ) : null}
      <nav aria-label="Etapas" className="mb-8 flex flex-wrap justify-between gap-3 text-sm">
        {prev ? (
          <Link href={`${base}/${w.id}/etapas/${prev.id}`} className="inline-flex min-h-11 items-center text-muted hover:text-ink">
            ← {prev.name}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`${base}/${w.id}/etapas/${next.id}`} className="inline-flex min-h-11 items-center text-muted hover:text-ink">
            {next.name} →
          </Link>
        ) : null}
      </nav>

      <Block index="01" title="Etapa">
        <ActionForm action={saveStage} submit="Salvar etapa">
          <input type="hidden" name="id" value={stage.id} />
          <Input label="Nome da etapa" name="nome" defaultValue={stage.name} required maxLength={WORKFLOW_LIMITS.stageName} />
          <CatalogStepSelect steps={w.catalogSteps} value={stage.procedureStepId} />
        </ActionForm>
        <div className="mt-4 border-t border-rule pt-3">
          <WfButton
            action={deleteStage}
            fields={{ id: stage.id, base }}
            label="Excluir etapa"
            data="excluir-etapa"
            variant="danger"
            confirmText={`Excluir a etapa “${stage.name}” com tudo o que há nela? Próximos passos que apontam para ela também saem.`}
          />
        </div>
      </Block>

      {ITEM_BLOCKS.map((b, i) => (
        <ItemBlock key={b.kind} index={two(i + 2)} stage={stage} items={sec[b.kind]} {...b} />
      ))}
      {lastPasso ? <p className="-mt-4 mb-8 text-xs text-muted">Workflow publicado: o último passo da etapa não pode ser excluído (adicione outro antes).</p> : null}

      <Block index="05" title="Próximos passos" hint="Só aparece o que você cadastrar aqui. Nada é deduzido pela ordem das etapas.">
        <div data-bloco="proximos">
          {stage.next.length ? (
            <ol className="mb-4 divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-surface">
              {[...stage.next]
                .sort((a, b) => a.position - b.position)
                .map((n, i, all) => (
                  <Row
                    key={n.id}
                    data={{ 'data-proximo': n.label ?? '' }}
                    lead="→"
                    move={<MoveButtons action={moveNext} id={n.id} first={i === 0} last={i === all.length - 1} name={n.label ?? 'próximo passo'} />}
                    remove={<WfButton action={deleteNext} fields={{ id: n.id }} label="Excluir" data="excluir" confirmText="Excluir este próximo passo?" />}
                    edit={
                      <ActionForm action={saveNext} submit="Salvar">
                        <input type="hidden" name="id" value={n.id} />
                        <NextFields stages={w.stages} label={n.label} target={n.targetStageId} note={n.note} />
                      </ActionForm>
                    }
                  >
                    {n.label ? <strong className="font-semibold">{n.label}</strong> : null}
                    {n.label && (n.targetStageId || n.note) ? ' → ' : null}
                    {n.targetStageId ? <span>{stageName.get(n.targetStageId) ?? 'etapa'}</span> : null}
                    {n.targetStageId && n.note ? ' · ' : null}
                    {n.note ? <span className="text-ink-2">{n.note}</span> : null}
                  </Row>
                ))}
            </ol>
          ) : (
            <p className="mb-4 text-sm text-muted">Nenhum próximo passo. Para o aluno, esta seção não aparece.</p>
          )}
          {stage.next.length < WORKFLOW_LIMITS.next ? (
            <AddPanel label="Adicionar próximo passo">
              <ActionForm action={addNext} submit="Adicionar">
                <input type="hidden" name="etapa" value={stage.id} />
                <NextFields stages={w.stages} />
              </ActionForm>
            </AddPanel>
          ) : (
            <p className="text-xs text-muted">Limite de {WORKFLOW_LIMITS.next} próximos passos atingido.</p>
          )}
        </div>
      </Block>

      <Block index="06" title="Para aprofundar" hint="Conteúdos que já existem na Biblioteca. Nada é enviado nem copiado aqui.">
        <div data-bloco="conteudos">
          {stage.linked.length ? (
            <ol className="mb-4 divide-y divide-rule overflow-hidden rounded-2xl border border-rule bg-surface">
              {stage.linked.map((l, i) => (
                <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3" data-conteudo={l.title ?? 'indisponivel'}>
                  <span className="min-w-0 flex-1 basis-48 text-[15px] break-words">
                    {l.title ? (
                      <>
                        {l.title} {l.kind ? <span className="text-xs text-muted">· {CONTENT_KIND[l.kind as keyof typeof CONTENT_KIND] ?? l.kind}</span> : null}
                      </>
                    ) : null}
                    {!l.available ? (
                      <span data-indisponivel className="block text-xs font-semibold text-ink-2">
                        {l.title ? 'Conteúdo indisponível para alunos (não está publicado na Biblioteca).' : 'Conteúdo indisponível para alunos'}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2">
                    <MoveButtons action={moveContent} id={l.id} first={i === 0} last={i === stage.linked.length - 1} name={l.title ?? 'conteúdo'} />
                    <WfButton action={removeContent} fields={{ id: l.id }} label="Remover" data="remover-conteudo" confirmText="Remover este conteúdo da etapa? Ele continua na Biblioteca." />
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mb-4 text-sm text-muted">Nenhum conteúdo relacionado.</p>
          )}
          {stage.linked.length < WORKFLOW_LIMITS.contents ? (
            choices.length ? (
              <AddPanel label="Relacionar conteúdo da Biblioteca">
                <ActionForm action={addContent} row submit="Relacionar">
                  <input type="hidden" name="etapa" value={stage.id} />
                  <label className="min-w-0 flex-1 basis-60 text-sm font-semibold">
                    Conteúdo publicado
                    <select name="conteudo" required defaultValue="" className={inputCls}>
                      <option value="" disabled>
                        Escolha…
                      </option>
                      {choices.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} · {CONTENT_KIND[c.kind as keyof typeof CONTENT_KIND] ?? c.kind}
                        </option>
                      ))}
                    </select>
                  </label>
                </ActionForm>
              </AddPanel>
            ) : (
              <p className="text-xs text-muted">Nenhum outro conteúdo publicado disponível para relacionar.</p>
            )
          ) : (
            <p className="text-xs text-muted">Limite de {WORKFLOW_LIMITS.contents} conteúdos atingido.</p>
          )}
        </div>
      </Block>
    </div>
  )
}
