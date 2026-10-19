import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { AddPanel, Block, Check, Editable, Input, Select, TextArea } from '@/components/admin/academic/ui'
import { HistoryList } from '@/components/admin/library/History'
import { StepChain } from '@/components/admin/procedures/StepChain'
import { requireUser } from '@/lib/auth/session'
import { adminTaxonomy } from '@/lib/admin/library'
import { adminCatalog, procedureHistory, stepDescriptions } from '@/lib/admin/procedures'
import { deleteStep, saveProcedure, saveProcedureTopics, saveStep } from '@/lib/admin/procedure-actions'
import { catalogIssues, experienceOnly, isSingleStep, type StepVM, stepLabel, UNIT_LABEL, UNITS } from '@/lib/procedures/model'

export const metadata: Metadata = { title: 'Procedimento' }

const UNIT_OPTIONS = UNITS.map((u) => [u, UNIT_LABEL[u].one] as [string, string])

function StepFields({ s, geral }: { s?: StepVM; geral: boolean }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Nome da etapa" name="nome" required maxLength={80} defaultValue={s?.name} />
        <Select label="Unidade" name="unidade" defaultValue={s?.unit ?? 'dente'} options={UNIT_OPTIONS} />
        <Input label="Ordem" name="posicao" type="number" min={0} defaultValue={s?.position ?? 1} />
      </div>
      <TextArea label="Sinônimos da etapa (opcional)" name="sinonimos" rows={1} defaultValue={s?.synonyms.join(', ') ?? ''} hint="Só para a busca." />
      <div className="flex flex-wrap gap-x-6">
        {geral ? null : <Check label="Conclui o tratamento (produção concluída)" name="conclui" defaultChecked={s?.completes ?? false} />}
        <Check label="Exige descrição (como “Outro procedimento”)" name="descricao" defaultChecked={s?.requiresDescription ?? false} />
        {s ? <Check label="Ativa (aparece no registro)" name="ativo" defaultChecked={s.active} /> : null}
      </div>
    </>
  )
}

export default async function AdminProcedurePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string }> }) {
  await requireUser(['admin'])
  const [{ id }, { criado }] = await Promise.all([params, searchParams])
  const [{ categories, procedures }, taxonomy] = await Promise.all([adminCatalog(), adminTaxonomy()])
  const p = procedures.find((x) => x.id === id)
  if (!p) notFound()
  const category = categories.find((c) => c.id === p.categoryId)
  const describing = p.steps.filter((s) => s.requiresDescription)
  const [history, descriptions] = await Promise.all([
    procedureHistory(p),
    Promise.all(describing.map(async (s) => ({ step: s, rows: await stepDescriptions(s.id) }))),
  ])
  const issues = catalogIssues(p)
  const geral = p.kind === 'geral'
  const activeTopics = taxonomy.topics.filter((t) => !t.archived)

  return (
    <>
      <Link href="/admin/procedimentos" className="text-sm text-muted hover:text-ink">
        ← Procedimentos
      </Link>
      <PageTitle eyebrow={category?.name ?? 'Procedimento'} title={p.name} lead={experienceOnly(p) ? 'Só experiência clínica: nenhuma etapa conclui.' : 'Tratamento com etapa que conclui (✓).'} />

      {criado === '1' ? (
        <p role="status" className="mb-6 rounded-2xl border border-rule bg-surface px-4 py-3 text-sm">
          ✓ Procedimento criado. Acrescente as outras etapas, se houver.
        </p>
      ) : null}
      {issues.length ? (
        <p role="alert" className="mb-6 rounded-2xl border border-[var(--brand)]/60 px-4 py-3 text-sm">
          ⚠ {issues.join(' ')}
        </p>
      ) : null}

      <Block index="01" title="Como aparece no registro" hint="O aluno toca numa destas opções (ou acha pela busca, inclusive pelos sinônimos).">
        <ul className="flex flex-wrap gap-2" aria-label="Opções no registro">
          {p.steps
            .filter((s) => s.active)
            .map((s) => (
              <li key={s.id} data-opcao={s.slug} className="glass rounded-full px-3.5 py-1.5 text-sm">
                {stepLabel(p, s)} <span className="text-xs text-muted">· {UNIT_LABEL[s.unit].many}</span>
                {s.completes ? <span className="ml-1 font-semibold">✓</span> : null}
              </li>
            ))}
        </ul>
        <StepChain procedure={p} />
        {p.synonyms.length ? <p className="text-xs text-muted">Também encontrado por: {p.synonyms.join(', ')}</p> : null}
      </Block>

      <Block index="02" title="Dados" hint="Desativar tira o procedimento do registro; os registros antigos continuam valendo.">
        <ActionForm action={saveProcedure}>
          <input type="hidden" name="id" value={p.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nome" name="nome" required maxLength={120} defaultValue={p.name} />
            <Select label="Categoria" name="categoria" defaultValue={p.categoryId} options={categories.filter((c) => !c.archived || c.id === p.categoryId).map((c) => [c.id, c.name])} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Tipo"
              name="tipo"
              defaultValue={p.kind}
              options={[
                ['tratamento', 'Tratamento'],
                ['geral', 'Geral (diagnóstico e planejamento, só experiência)'],
              ]}
            />
            <Input label="Ordem na categoria" name="posicao" type="number" min={0} defaultValue={p.position} />
          </div>
          <TextArea label="Sinônimos" name="sinonimos" rows={2} defaultValue={p.synonyms.join(', ')} hint="Separados por vírgula. Só para a busca: levam a este procedimento, nunca criam outro." />
          <Check label="Ativo (aparece no registro)" name="ativo" defaultChecked={p.active} />
        </ActionForm>
      </Block>

      <Block
        index="03"
        title="Etapas clínicas"
        hint="Cada etapa tem a sua unidade. No máximo uma conclui o tratamento. Etapa com registros não é apagada: desative-a."
      >
        <ul className="space-y-2">
          {p.steps.map((s) => (
            <li key={s.id} data-etapa={s.slug}>
              <Editable
                summary={
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                    <span className="num w-5 text-muted">{s.position}</span>
                    <span className={s.active ? 'font-semibold' : 'text-muted line-through'}>{isSingleStep(p) ? `${s.name} (etapa única)` : s.name}</span>
                    <span className="text-xs text-muted">{UNIT_LABEL[s.unit].one}</span>
                    {s.completes ? <span className="text-xs font-semibold">✓ conclui</span> : null}
                    {s.requiresDescription ? <span className="text-xs text-muted">descrição obrigatória</span> : null}
                    <span className="ml-auto text-xs text-muted">{s.uses ? `${s.uses} ${s.uses === 1 ? 'registro' : 'registros'}` : 'sem registros'}</span>
                  </span>
                }
              >
                <ActionForm action={saveStep}>
                  <input type="hidden" name="id" value={s.id} />
                  <StepFields s={s} geral={geral} />
                </ActionForm>
                {s.uses === 0 && p.steps.length > 1 ? (
                  <ActionForm action={deleteStep} submit="Apagar etapa" quiet className="mt-3" confirmText={`Apagar a etapa "${s.name}"? Ela não tem registros.`}>
                    <input type="hidden" name="id" value={s.id} />
                  </ActionForm>
                ) : null}
              </Editable>
            </li>
          ))}
        </ul>
        <AddPanel label="Nova etapa">
          <ActionForm action={saveStep} submit="Criar etapa">
            <input type="hidden" name="procedimento" value={p.id} />
            <StepFields geral={geral} />
          </ActionForm>
        </AddPanel>
      </Block>

      <Block index="04" title="Temas relacionados" hint="Ligam o procedimento à biblioteca (conteúdos relacionados no caso e, depois, recomendações).">
        <ActionForm action={saveProcedureTopics} submit="Salvar temas">
          <input type="hidden" name="id" value={p.id} />
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {taxonomy.categories
              .filter((c) => !c.archived)
              .map((c) => {
                const list = activeTopics.filter((t) => t.categoryId === c.id)
                return list.length ? (
                  <fieldset key={c.id} className="mb-3">
                    <legend className="eyebrow text-[10px]">{c.name}</legend>
                    {list.map((t) => (
                      <div key={t.id}>
                        <Check label={t.name} name="temas" value={t.id} defaultChecked={p.topicIds.includes(t.id)} />
                      </div>
                    ))}
                  </fieldset>
                ) : null
              })}
          </div>
        </ActionForm>
      </Block>

      {descriptions.map(({ step, rows }) => (
        <Block key={step.id} index="05" title="Descrições frequentes" hint="O que os alunos escrevem em “Outro procedimento”, agrupado. Ajuda a decidir o que vira item oficial do catálogo.">
          {rows.length ? (
            <ul className="divide-y divide-rule rounded-2xl border border-rule bg-surface text-sm">
              {rows.map((r) => (
                <li key={r.description} className="flex items-center justify-between gap-4 px-4 py-2">
                  <span>{r.description}</span>
                  <span className="num shrink-0 text-xs text-muted">
                    {r.records} {r.records === 1 ? 'registro' : 'registros'} · {r.students} {r.students === 1 ? 'aluno' : 'alunos'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nenhuma descrição registrada ainda.</p>
          )}
        </Block>
      ))}

      <Block index="—" title="Histórico" hint="Quem alterou, quando e o que mudou (procedimento e etapas).">
        <HistoryList history={history} />
      </Block>
    </>
  )
}
