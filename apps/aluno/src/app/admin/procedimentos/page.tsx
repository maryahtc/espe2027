import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { AddPanel, Block, Check, Editable, Input, Select, TextArea } from '@/components/admin/academic/ui'
import { StepChain } from '@/components/admin/procedures/StepChain'
import { requireUser } from '@/lib/auth/session'
import { adminCatalog } from '@/lib/admin/procedures'
import { createProcedure, saveProcedureCategory, setProcedureCategoryArchived } from '@/lib/admin/procedure-actions'
import { experienceOnly, UNIT_LABEL, UNITS } from '@/lib/procedures/model'

export const metadata: Metadata = { title: 'Procedimentos' }

const UNIT_OPTIONS = UNITS.map((u) => [u, UNIT_LABEL[u].one] as [string, string])

export default async function AdminProceduresPage() {
  await requireUser(['admin'])
  const { categories, procedures } = await adminCatalog()
  const active = categories.filter((c) => !c.archived)
  const steps = procedures.reduce((n, p) => n + p.steps.length, 0)

  return (
    <>
      <PageTitle
        eyebrow="Clínica"
        title="Procedimentos"
        lead={`${active.length} categorias · ${procedures.length} procedimentos · ${steps} etapas clínicas. A base da Produção: o aluno registra a etapa que fez; a experiência clínica conta todas as etapas e a produção concluída conta só a etapa que conclui (✓).`}
      />

      <div className="glass mb-8 grid gap-3 rounded-2xl p-5 text-sm sm:grid-cols-3">
        <p>
          <span className="font-semibold">Etapa clínica</span>
          <span className="block text-xs text-muted">O que se faz numa consulta, com a sua unidade (dente, peça, arcada, caso).</span>
        </p>
        <p>
          <span className="font-semibold">✓ Conclui</span>
          <span className="block text-xs text-muted">No máximo uma por procedimento. Só ela entra na produção concluída.</span>
        </p>
        <p>
          <span className="font-semibold">Só experiência</span>
          <span className="block text-xs text-muted">Procedimentos sem etapa que conclui (gerais, clareamentos, “Outro”).</span>
        </p>
      </div>

      {active.map((cat, i) => {
        const list = procedures.filter((p) => p.categoryId === cat.id)
        return (
          <Block key={cat.id} index={String(i + 1).padStart(2, '0')} title={cat.name} hint={`${list.length} ${list.length === 1 ? 'procedimento' : 'procedimentos'}`}>
            {list.length ? (
              <ul className="divide-y divide-rule rounded-2xl border border-rule bg-surface">
                {list.map((p) => {
                  const uses = p.steps.reduce((n, s) => n + s.uses, 0)
                  return (
                    <li key={p.id} data-procedimento={p.slug}>
                      <Link href={`/admin/procedimentos/${p.id}`} className="group block px-4 py-3 hover:bg-white/[0.03]">
                        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className={`font-semibold group-hover:underline ${p.active ? '' : 'text-muted line-through'}`}>{p.name}</span>
                          {p.kind === 'geral' ? <span className="text-xs text-muted">geral</span> : null}
                          {experienceOnly(p) ? <span className="text-xs text-muted">só experiência</span> : null}
                          {!p.active ? <span className="text-xs font-semibold text-muted">desativado</span> : null}
                          <span className="ml-auto text-xs text-muted">
                            {uses ? `${uses} ${uses === 1 ? 'registro' : 'registros'}` : 'sem registros'}
                            {p.synonyms.length ? ` · ${p.synonyms.length} sinônimos` : ''}
                          </span>
                        </span>
                        <StepChain procedure={p} className="mt-1" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nenhum procedimento nesta categoria.</p>
            )}
            <AddPanel label={`Novo procedimento em ${cat.name}`}>
              <ActionForm action={createProcedure} submit="Criar procedimento">
                <input type="hidden" name="categoria" value={cat.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Nome do procedimento" name="nome" required maxLength={120} />
                  <Select
                    label="Tipo"
                    name="tipo"
                    defaultValue="tratamento"
                    options={[
                      ['tratamento', 'Tratamento'],
                      ['geral', 'Geral (diagnóstico e planejamento, só experiência)'],
                    ]}
                  />
                </div>
                <TextArea label="Sinônimos" name="sinonimos" rows={2} hint="Separados por vírgula. Só para a busca: levam a este procedimento, nunca criam outro." />
                <p className="text-xs text-muted">
                  Primeira etapa. Deixe o nome em branco para um procedimento simples (etapa única com o mesmo nome). Outras etapas são
                  acrescentadas na página do procedimento.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input label="Etapa (opcional)" name="etapa" maxLength={80} placeholder="Ex.: Preparo" />
                  <Select label="Unidade" name="unidade" defaultValue="dente" options={UNIT_OPTIONS} />
                  <Input label="Ordem" name="posicao" type="number" min={0} defaultValue={list.length + 1} />
                </div>
                <Check label="Esta etapa conclui o tratamento (entra na produção concluída)" name="conclui" />
              </ActionForm>
            </AddPanel>
          </Block>
        )
      })}

      <Block index="—" title="Categorias" hint="Organizam a lista no registro e na Produção. Arquivar tira a categoria da lista; nada é apagado.">
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.id}>
              <Editable
                summary={
                  <span className="flex items-baseline gap-3 text-sm">
                    <span className="num w-6 text-muted">{c.position}</span>
                    <span className={c.archived ? 'text-muted line-through' : 'font-semibold'}>{c.name}</span>
                    {c.archived ? <span className="text-xs text-muted">arquivada</span> : null}
                  </span>
                }
              >
                <ActionForm action={saveProcedureCategory} row>
                  <input type="hidden" name="id" value={c.id} />
                  <Input label="Nome" name="nome" required defaultValue={c.name} className="min-w-[16rem] flex-1" />
                  <Input label="Ordem" name="posicao" type="number" min={0} defaultValue={c.position} className="w-24" />
                </ActionForm>
                <ActionForm action={setProcedureCategoryArchived} submit={c.archived ? 'Restaurar categoria' : 'Arquivar categoria'} quiet className="mt-3">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="arquivar" value={c.archived ? 'nao' : 'sim'} />
                </ActionForm>
              </Editable>
            </li>
          ))}
        </ul>
        <AddPanel label="Nova categoria">
          <ActionForm action={saveProcedureCategory} submit="Criar categoria" row>
            <Input label="Nome" name="nome" required className="min-w-[16rem] flex-1" />
            <Input label="Ordem" name="posicao" type="number" min={0} defaultValue={categories.length + 1} className="w-24" />
          </ActionForm>
        </AddPanel>
      </Block>
    </>
  )
}
