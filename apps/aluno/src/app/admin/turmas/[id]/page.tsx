import { createSupabaseServerClient } from '@portal/db/server'
import { ButtonLink } from '@portal/ui/button'
import { PageTitle } from '@portal/ui/section'
import { StatusPill } from '@portal/ui/tag'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { AddPanel, Block, Editable, Input, Select, TextArea } from '@/components/admin/academic/ui'
import { deleteEvent, saveEvent, setCohortStatus, updateCohort } from '@/lib/admin/academic-actions'
import { adminModules, listCohorts } from '@/lib/admin/academic'
import { EVENT_KIND_LABEL } from '@/lib/academic/model'
import { formatDayMonth, formatRange, year } from '@/lib/dates'

export const metadata: Metadata = { title: 'Turma' }

const EVENT_OPTIONS = Object.entries(EVENT_KIND_LABEL) as Array<[string, string]>
const STATUS_OPTIONS: Array<[string, string]> = [
  ['rascunho', 'Rascunho (invisível)'],
  ['publicado', 'Publicado'],
  ['arquivado', 'Arquivado'],
]

type EventRow = { id: string; date: string; starts_at: string | null; title: string; description: string | null; kind: string; status: 'rascunho' | 'publicado' | 'arquivado' }

function EventFields({ e }: { e?: EventRow }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-4">
        <Input label="Data" name="data" type="date" required defaultValue={e?.date} />
        <Input label="Horário" name="hora" type="time" defaultValue={e?.starts_at?.slice(0, 5) ?? ''} />
        <Select label="Tipo" name="tipo" defaultValue={e?.kind ?? 'online'} options={EVENT_OPTIONS} />
        <Select label="Situação" name="status" defaultValue={e?.status ?? 'publicado'} options={STATUS_OPTIONS} />
      </div>
      <Input label="Título" name="titulo" required defaultValue={e?.title} />
      <TextArea label="Detalhes (opcional)" name="descricao" rows={2} defaultValue={e?.description ?? ''} />
    </>
  )
}

export default async function AdminCohortPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cohort = (await listCohorts()).find((c) => c.id === id)
  if (!cohort) notFound()
  const supabase = await createSupabaseServerClient()
  const [modules, { data: events }] = await Promise.all([
    adminModules(id),
    supabase!.from('cohort_events').select('id, date, starts_at, title, description, kind, status').eq('cohort_id', id).order('date'),
  ])
  const closed = cohort.status === 'encerrada'
  return (
    <>
      <Link href="/admin/turmas" className="text-sm text-muted hover:text-ink">
        ← Turmas
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle
          eyebrow={closed ? 'Turma encerrada' : 'Turma ativa'}
          title={cohort.name}
          lead={`${formatRange(cohort.startsOn, cohort.endsOn)} · ${cohort.students} ${cohort.students === 1 ? 'aluno' : 'alunos'} · ${cohort.modules} módulos (${cohort.published} publicados)`}
        />
        <div className="mb-8 flex flex-wrap items-center gap-3 md:mb-10">
          <ButtonLink href={`/admin/modulos?turma=${cohort.id}`} variant="secondary">
            Módulos e cronograma
          </ButtonLink>
          <ActionForm
            action={setCohortStatus}
            submit={closed ? 'Reabrir turma' : 'Encerrar turma'}
            confirmText={closed ? undefined : 'Encerrar a turma? Nada é apagado e os alunos continuam vendo o histórico (cronograma, módulos e materiais).'}
          >
            <input type="hidden" name="id" value={cohort.id} />
            <input type="hidden" name="status" value={closed ? 'ativa' : 'encerrada'} />
          </ActionForm>
        </div>
      </div>

      <Block index="01" title="Dados da turma" hint="O período define os meses do cronograma dos alunos.">
        <ActionForm action={updateCohort}>
          <input type="hidden" name="id" value={cohort.id} />
          <Input label="Nome" name="nome" required defaultValue={cohort.name} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Início" name="inicio" type="date" required defaultValue={cohort.startsOn} />
            <Input label="Previsão de conclusão" name="fim" type="date" required defaultValue={cohort.endsOn} />
          </div>
          <TextArea label="Descrição (opcional)" name="descricao" rows={2} defaultValue={cohort.description ?? ''} />
        </ActionForm>
      </Block>

      <Block index="02" title="Módulos" hint="Ordem, datas e situação. Para editar, abra o módulo.">
        {modules.length ? (
          <ul className="divide-y divide-rule rounded-2xl border border-rule bg-surface">
            {modules.map((m) => (
              <li key={m.id}>
                <Link href={`/admin/modulos/${m.id}`} className="grid grid-cols-[3rem_1fr_auto] items-center gap-4 px-4 py-3 text-sm hover:bg-white/[0.04]">
                  <span className="num text-lg font-light">{m.label}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{m.title}</span>
                    <span className="num block text-xs text-muted">{m.start ? `${formatDayMonth(m.start)}/${year(m.start)}` : 'Sem datas'}</span>
                  </span>
                  <StatusPill status={m.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nenhum módulo ainda.</p>
        )}
      </Block>

      <Block index="03" title="Outros eventos do calendário" hint="Aula online, clínica extra, prazos gerais. Publicados aparecem no cronograma dos alunos.">
        {(events ?? []).length ? (
          <ul className="space-y-2">
            {(events as EventRow[]).map((e) => (
              <li key={e.id}>
                <Editable
                  summary={
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="num">{formatDayMonth(e.date)}/{year(e.date)}</span>
                      <span className="font-semibold">{e.title}</span>
                      <span className="text-xs text-muted">{EVENT_KIND_LABEL[e.kind as keyof typeof EVENT_KIND_LABEL]}</span>
                      <StatusPill status={e.status} />
                    </span>
                  }
                >
                  <ActionForm action={saveEvent}>
                    <input type="hidden" name="id" value={e.id} />
                    <EventFields e={e} />
                  </ActionForm>
                  <ActionForm action={deleteEvent} submit="Remover evento" quiet confirmText="Remover este evento?" className="mt-3">
                    <input type="hidden" name="id" value={e.id} />
                  </ActionForm>
                </Editable>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nenhum evento.</p>
        )}
        <AddPanel label="Adicionar evento">
          <ActionForm action={saveEvent} submit="Adicionar">
            <input type="hidden" name="turma" value={cohort.id} />
            <EventFields />
          </ActionForm>
        </AddPanel>
      </Block>
    </>
  )
}
