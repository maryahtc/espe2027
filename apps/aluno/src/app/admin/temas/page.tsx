import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { AddPanel, Block, Editable, Input, Select, TextArea } from '@/components/admin/academic/ui'
import { requireUser } from '@/lib/auth/session'
import { type AdminTopic, adminTaxonomy } from '@/lib/admin/library'
import { mergeTopic, saveCategory, saveTopic, setCategoryArchived, setTopicArchived } from '@/lib/admin/library-actions'
import type { CategoryVM } from '@/lib/library/model'

export const metadata: Metadata = { title: 'Temas' }

function TopicFields({ t, categories, defaultArea }: { t?: AdminTopic; categories: CategoryVM[]; defaultArea?: string }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nome do tema" name="nome" required defaultValue={t?.name} />
        <Select
          label="Área"
          name="area"
          defaultValue={t?.categoryId ?? defaultArea}
          options={categories.filter((c) => !c.archived || c.id === t?.categoryId).map((c) => [c.id, c.name])}
        />
      </div>
      <TextArea label="Descrição (opcional, aparece na página do tema)" name="descricao" rows={2} defaultValue={t?.description ?? ''} />
      <TextArea
        label="Sinônimos"
        name="sinonimos"
        rows={2}
        defaultValue={t?.synonyms.join(', ') ?? ''}
        hint="Separados por vírgula. Servem para a busca (e, no futuro, para a IA); não aparecem como etiqueta para o aluno."
      />
      <TextArea label="Origem / observação interna" name="origem" rows={2} defaultValue={t?.origin ?? ''} hint="Só admin e coordenação veem." />
    </>
  )
}

export default async function AdminTopicsPage() {
  await requireUser(['admin'])
  const { categories, topics } = await adminTaxonomy()
  const active = categories.filter((c) => !c.archived)
  const activeTopics = topics.filter((t) => !t.archived)
  const archivedTopics = topics.filter((t) => t.archived)

  return (
    <>
      <PageTitle
        eyebrow="Biblioteca"
        title="Temas"
        lead={`${active.length} áreas · ${activeTopics.length} temas. O vocabulário que liga a biblioteca e, nas próximas etapas, os casos, as recomendações e os workflows.`}
      />

      {active.map((cat, i) => {
        const list = activeTopics.filter((t) => t.categoryId === cat.id)
        return (
          <Block key={cat.id} index={String(i + 1).padStart(2, '0')} title={cat.name} hint={`${list.length} ${list.length === 1 ? 'tema' : 'temas'}`}>
            {list.length ? (
              <ul className="space-y-2">
                {list.map((t) => (
                  <li key={t.id}>
                    <Editable
                      summary={
                        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                          <span className="font-semibold">{t.name}</span>
                          <span className="text-xs text-muted">
                            {t.contents} {t.contents === 1 ? 'conteúdo' : 'conteúdos'}
                            {t.synonyms.length ? ` · ${t.synonyms.length} sinônimos` : ''}
                          </span>
                          {t.origin ? <span className="w-full text-xs text-faint">Origem: {t.origin}</span> : null}
                        </span>
                      }
                    >
                      <ActionForm action={saveTopic}>
                        <input type="hidden" name="id" value={t.id} />
                        <TopicFields t={t} categories={categories} />
                      </ActionForm>
                      <div className="mt-5 grid gap-5 border-t border-rule pt-4 sm:grid-cols-2">
                        <ActionForm action={mergeTopic} submit="Juntar" confirmText={`Juntar "${t.name}" ao tema escolhido? Os conteúdos e sinônimos passam para ele e "${t.name}" é arquivado.`}>
                          <input type="hidden" name="id" value={t.id} />
                          <Select
                            label="Juntar a outro tema (quando forem a mesma coisa)"
                            name="destino"
                            options={activeTopics.filter((o) => o.id !== t.id).map((o) => [o.id, o.name])}
                          />
                        </ActionForm>
                        <ActionForm action={setTopicArchived} submit="Arquivar tema" quiet confirmText={`Arquivar "${t.name}"? Ele sai das listas de escolha; nada é apagado.`}>
                          <input type="hidden" name="id" value={t.id} />
                          <input type="hidden" name="arquivar" value="sim" />
                        </ActionForm>
                      </div>
                    </Editable>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nenhum tema nesta área.</p>
            )}
            <AddPanel label={`Novo tema em ${cat.name}`}>
              <ActionForm action={saveTopic} submit="Criar tema">
                <TopicFields categories={categories} defaultArea={cat.id} />
              </ActionForm>
            </AddPanel>
          </Block>
        )
      })}

      <Block index="—" title="Áreas" hint="As gavetas de navegação da biblioteca. Cada conteúdo tem uma área; cada tema pertence a uma área.">
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
                <ActionForm action={saveCategory} row>
                  <input type="hidden" name="id" value={c.id} />
                  <Input label="Nome" name="nome" required defaultValue={c.name} className="min-w-[16rem] flex-1" />
                  <Input label="Ordem" name="posicao" type="number" min={0} defaultValue={c.position} className="w-24" />
                </ActionForm>
                <ActionForm action={setCategoryArchived} submit={c.archived ? 'Restaurar área' : 'Arquivar área'} quiet className="mt-3">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="arquivar" value={c.archived ? 'nao' : 'sim'} />
                </ActionForm>
              </Editable>
            </li>
          ))}
        </ul>
        <AddPanel label="Nova área">
          <ActionForm action={saveCategory} submit="Criar área" row>
            <Input label="Nome" name="nome" required className="min-w-[16rem] flex-1" />
            <Input label="Ordem" name="posicao" type="number" min={0} defaultValue={categories.length + 1} className="w-24" />
          </ActionForm>
        </AddPanel>
      </Block>

      {archivedTopics.length ? (
        <Block index="—" title="Temas arquivados" hint="Fora das listas de escolha. Restaurar devolve o tema às listas.">
          <ul className="divide-y divide-rule rounded-2xl border border-rule bg-surface">
            {archivedTopics.map((t) => {
              const into = t.mergedInto ? topics.find((o) => o.id === t.mergedInto) : null
              return (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    <span className="text-muted line-through">{t.name}</span>
                    {into ? <span className="ml-2 text-xs text-muted">juntado a {into.name}</span> : null}
                  </span>
                  <ActionForm action={setTopicArchived} submit="Restaurar" quiet>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="arquivar" value="nao" />
                  </ActionForm>
                </li>
              )
            })}
          </ul>
        </Block>
      ) : null}

      <p className="mt-6 text-sm text-muted">
        Para ver como o aluno navega pelos temas, abra{' '}
        <Link href="/biblioteca/temas" className="underline">
          Biblioteca → Temas
        </Link>
        .
      </p>
    </>
  )
}
