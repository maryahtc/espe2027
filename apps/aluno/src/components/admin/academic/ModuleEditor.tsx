import { ButtonLink } from '@portal/ui/button'
import { RequirementTag, StatusPill } from '@portal/ui/tag'
import Link from 'next/link'
import {
  addSessionFaculty,
  deleteDay,
  deleteDeliverable,
  deleteDraftModule,
  deleteMaterial,
  deleteResource,
  deleteSession,
  removeStaff,
  saveDay,
  saveDeliverable,
  saveInternalNotes,
  saveMaterial,
  saveSession,
  saveStaff,
  setModuleStatus,
  updateModuleInfo,
  updateSessionFaculty,
} from '@/lib/admin/academic-actions'
import type { AdminModulePage, HistoryEntry } from '@/lib/admin/academic'
import {
  ACTIVITY_LABEL,
  FACULTY_KIND_LABEL,
  PERIOD_LABEL,
  PHASE_LABEL,
  sessionTime,
  STAFF_LABEL,
  type ActivityType,
  type DayPeriod,
  type SessionVM,
} from '@/lib/academic/model'
import type { ResourceVM } from '@/lib/academic/load'
import { formatDayMonth, formatRange, weekday } from '@/lib/dates'
import { ActionForm } from './ActionForm'
import { ResourceForm } from './ResourceForm'
import { AddPanel, Block, Check, Editable, Input, Select, TextArea } from './ui'

const PERIOD_OPTIONS = Object.entries(PERIOD_LABEL) as Array<[DayPeriod, string]>
const TYPE_OPTIONS = Object.entries(ACTIVITY_LABEL).map(([k, v]) => [k, k === 'outro' ? 'Outra / não definida' : v]) as Array<[ActivityType, string]>
const STAFF_OPTIONS = Object.entries(STAFF_LABEL) as Array<[string, string]>
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })

function SessionFields({ s }: { s?: SessionVM }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-4">
        <Select label="Turno" name="turno" defaultValue={s?.period ?? 'manha'} options={PERIOD_OPTIONS} />
        <Input label="Início (opcional)" name="inicio" type="time" defaultValue={s?.startsAt?.slice(0, 5) ?? ''} />
        <Input label="Fim (opcional)" name="fim" type="time" defaultValue={s?.endsAt?.slice(0, 5) ?? ''} />
        <Select label="Tipo" name="tipo" defaultValue={s?.type ?? 'outro'} options={TYPE_OPTIONS} />
      </div>
      <Input label="Atividade" name="titulo" required defaultValue={s?.title} />
      <TextArea label="Detalhes (opcional)" name="descricao" rows={2} defaultValue={s?.description ?? ''} />
    </>
  )
}

function describeChange(e: HistoryEntry): string {
  if (e.action === 'insert') return 'criou'
  if (e.action === 'delete') return 'removeu'
  const keys = Object.keys(e.changes)
  const LABEL: Record<string, string> = {
    title: 'título', number: 'número', theme: 'tema', description: 'descrição', location: 'local', workload_hours: 'carga horária',
    preparation: 'preparação', materials_notes: 'observações dos materiais', status: 'situação', position: 'ordem', date: 'data',
    label: 'rótulo', note: 'nota', period: 'turno', starts_at: 'início', ends_at: 'fim', activity_type: 'tipo', tentative: 'a confirmar',
    role: 'papel', visible_to_students: 'visibilidade', item: 'item', group_label: 'grupo', required: 'obrigatoriedade', due_date: 'prazo',
    phase: 'fase', requirement: 'obrigatoriedade', available_from: 'liberação', url: 'link', body: 'texto', notes: 'texto',
  }
  const fmt = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'string' ? (v.length > 40 ? `${v.slice(0, 40)}…` : v) : String(v))
  return keys
    .map((k) => {
      const c = e.changes[k] as { de?: unknown; para?: unknown }
      return `${LABEL[k] ?? k}: ${fmt(c?.de)} → ${fmt(c?.para)}`
    })
    .join(' · ')
}

/** Editor do módulo: um formulário por bloco; tudo grava na hora e entra no histórico. */
export function ModuleEditor({ page, internalNotes }: { page: AdminModulePage; internalNotes: string }) {
  const { detail, cohort, faculty, history, students } = page
  const m = detail.module
  const published = m.status === 'publicado'
  const impact = published ? `Este módulo está publicado: a mudança aparece na hora para ${students} aluno${students === 1 ? '' : 's'} da turma. Continuar?` : undefined
  const facultyOptions = faculty
    .filter((f) => f.active)
    .map((f) => [f.id, `${f.name}${f.fullName !== f.name ? ` (${f.fullName})` : ''} · ${FACULTY_KIND_LABEL[f.kind]}`] as [string, string])
  const sessionOptions = m.days.flatMap((d, i) => d.sessions.map((s) => ({ id: s.id, label: `Dia ${i + 1} · ${s.title}` })))
  const before = detail.resources.filter((r) => r.phase === 'antes')
  const after = detail.resources.filter((r) => r.phase !== 'antes')
  const staffIds = new Set(m.staff.map((s) => s.faculty.id))

  const resourceList = (items: ResourceVM[], phase: 'antes' | 'durante') => (
    <>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id}>
              <Editable
                summary={
                  <span className="block text-sm">
                    <span className="font-semibold">{r.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <RequirementTag level={r.requirement} />
                      <span>{r.kind === 'link' ? 'Link' : r.kind === 'arquivo' ? 'Arquivo' : 'Texto'}</span>
                      <span>{PHASE_LABEL[r.phase]}</span>
                      <StatusPill status={r.status} />
                      {r.availableFrom ? <span className="num">libera {dateTime.format(new Date(r.availableFrom))}</span> : null}
                    </span>
                  </span>
                }
              >
                <ResourceForm moduleId={m.id} sessions={sessionOptions} resource={r} />
                <ActionForm action={deleteResource} submit="Remover" quiet confirmText="Remover este item do módulo?" className="mt-4">
                  <input type="hidden" name="id" value={r.id} />
                </ActionForm>
              </Editable>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nada cadastrado.</p>
      )}
      <AddPanel label={phase === 'antes' ? 'Adicionar aula, link, arquivo ou texto de preparação' : 'Adicionar material de aula (durante ou depois)'}>
        <ResourceForm moduleId={m.id} sessions={sessionOptions} defaultPhase={phase} />
      </AddPanel>
    </>
  )

  return (
    <div>
      <Link href={`/admin/modulos?turma=${cohort.id}`} className="text-sm text-muted hover:text-ink">
        ← Módulos e cronograma · {cohort.name}
      </Link>
      <div className="mt-4 mb-6">
        <p className="eyebrow">
          {cohort.name} · módulo {m.label}
        </p>
        <h1 className="mt-1 text-3xl font-light tracking-tight sm:text-4xl">{m.title}</h1>
        <p className="num mt-1 text-sm text-muted">{m.start && m.end ? formatRange(m.start, m.end) : 'Sem datas'}</p>
      </div>

      {/* Situação e publicação */}
      <div className="glass-strong sticky top-14 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 lg:top-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusPill status={m.status} />
          <span className="text-muted">
            {published ? `visível para ${students} aluno${students === 1 ? '' : 's'} · alterações valem na hora` : m.status === 'rascunho' ? 'invisível para os alunos' : 'fora da vista dos alunos; histórico mantido'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {m.status !== 'arquivado' ? (
            <ActionForm action={setModuleStatus} submit="Arquivar" quiet confirmText="Arquivar este módulo? Ele sai do cronograma dos alunos; nada é apagado e dá para restaurar.">
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="status" value="arquivado" />
            </ActionForm>
          ) : null}
          {!m.publishedAt && m.status === 'rascunho' ? (
            <ActionForm action={deleteDraftModule} submit="Excluir rascunho" quiet confirmText="Excluir de vez este módulo em rascunho (nunca publicado)?">
              <input type="hidden" name="id" value={m.id} />
            </ActionForm>
          ) : null}
          <ButtonLink href={`/admin/modulos/${m.id}/previa`} variant="secondary">
            Pré-visualizar como aluno
          </ButtonLink>
          {published ? (
            <ActionForm action={setModuleStatus} submit="Voltar a rascunho" confirmText="Tirar este módulo da vista dos alunos (voltar a rascunho)?">
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="status" value="rascunho" />
            </ActionForm>
          ) : (
            <ActionForm
              action={setModuleStatus}
              submit={m.status === 'arquivado' ? 'Restaurar como rascunho' : 'Publicar'}
              variant="primary"
              confirmText={m.status === 'arquivado' ? undefined : `Publicar? O módulo passa a aparecer para ${students} aluno${students === 1 ? '' : 's'} da turma.`}
            >
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="status" value={m.status === 'arquivado' ? 'rascunho' : 'publicado'} />
            </ActionForm>
          )}
        </div>
      </div>

      <Block index="01" title="Informações" hint="O que o aluno vê no topo da página do módulo.">
        <ActionForm action={updateModuleInfo} confirmText={impact}>
          <input type="hidden" name="id" value={m.id} />
          <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
            <Input label="Número" name="numero" type="number" min={1} defaultValue={m.number ?? ''} />
            <Input label="Título" name="titulo" required defaultValue={m.title} />
          </div>
          <Input label="Tema" name="tema" defaultValue={m.theme ?? ''} />
          <TextArea label="Descrição para os alunos" name="descricao" rows={3} defaultValue={m.description ?? ''} />
          <div className="grid gap-5 sm:grid-cols-[1fr_10rem]">
            <Input label="Local" name="local" defaultValue={m.location ?? ''} />
            <Input label="Carga horária (h)" name="carga" inputMode="decimal" defaultValue={m.workloadHours ?? ''} />
          </div>
        </ActionForm>
      </Block>

      <Block index="02" title="Programação" hint="Dias do módulo (quantos forem) e as atividades de cada dia, por turno, com horário opcional, tipo e professores.">
        {m.days.map((d, i) => (
          <div key={d.id} className="glass rounded-2xl p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="eyebrow">
                Dia {i + 1} · {weekday(d.date)}, {formatDayMonth(d.date)}
                {d.label && d.label !== `Dia ${i + 1}` ? ` · ${d.label}` : ''}
              </p>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-ink">Alterar data, rótulo ou remover o dia</summary>
              <div className="mt-3 space-y-3">
                <ActionForm action={saveDay} row confirmText={impact}>
                  <input type="hidden" name="id" value={d.id} />
                  <Input label="Data" name="data" type="date" required defaultValue={d.date} />
                  <Input label="Rótulo" name="rotulo" defaultValue={d.label ?? ''} placeholder="Dia 1" />
                  <Input label="Nota (visível ao aluno)" name="nota" defaultValue={d.note ?? ''} className="min-w-[14rem] flex-1" />
                </ActionForm>
                <ActionForm action={deleteDay} submit="Remover este dia" quiet confirmText={`Remover o dia ${formatDayMonth(d.date)} e todas as atividades dele?`}>
                  <input type="hidden" name="id" value={d.id} />
                </ActionForm>
              </div>
            </details>

            <ul className="mt-3 space-y-2">
              {d.sessions.map((s) => (
                <li key={s.id}>
                  <Editable
                    summary={
                      <span className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[7rem_1fr_auto]">
                        <span className="num text-ink-2">{sessionTime(s)}</span>
                        <span className="min-w-0">
                          <span className="block font-semibold">{s.title}</span>
                          <span className="block text-xs text-muted">
                            {s.faculty.length ? s.faculty.map((f) => (f.tentative ? `${f.name} (a confirmar)` : f.name)).join(', ') : 'Sem professor vinculado'}
                          </span>
                        </span>
                        <span className="text-xs text-muted">{ACTIVITY_LABEL[s.type]}</span>
                      </span>
                    }
                  >
                    <ActionForm action={saveSession} confirmText={impact}>
                      <input type="hidden" name="id" value={s.id} />
                      <SessionFields s={s} />
                    </ActionForm>

                    <div className="mt-5 border-t border-rule pt-4">
                      <p className="text-sm font-semibold">Professores desta atividade</p>
                      <ul className="mt-2 space-y-1.5">
                        {s.faculty.map((f) => (
                          <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span className="min-w-[8rem] font-semibold">{f.name}</span>
                            <ActionForm action={updateSessionFaculty} row quiet submit={f.tentative ? 'Confirmar' : 'Marcar "a confirmar"'}>
                              <input type="hidden" name="atividade" value={s.id} />
                              <input type="hidden" name="docente" value={f.id} />
                              <input type="hidden" name="a_confirmar" value={f.tentative ? '' : 'sim'} />
                            </ActionForm>
                            <ActionForm action={updateSessionFaculty} row quiet submit="Remover">
                              <input type="hidden" name="atividade" value={s.id} />
                              <input type="hidden" name="docente" value={f.id} />
                              <input type="hidden" name="acao" value="remover" />
                            </ActionForm>
                            {f.tentative ? <span className="text-xs text-muted">a confirmar</span> : null}
                          </li>
                        ))}
                      </ul>
                      <ActionForm action={addSessionFaculty} row submit="Vincular" className="mt-3">
                        <input type="hidden" name="atividade" value={s.id} />
                        <Select
                          label="Adicionar professor"
                          name="docente"
                          options={facultyOptions.filter(([fid]) => !s.faculty.some((f) => f.id === fid))}
                          className="min-w-[16rem] flex-1"
                        />
                        <Check label="a confirmar" name="a_confirmar" />
                      </ActionForm>
                      <p className="mt-2 text-xs text-muted">
                        Pessoa nova? Cadastre em{' '}
                        <Link href="/admin/equipe#docentes" className="underline underline-offset-2">
                          Docentes e coordenação
                        </Link>
                        .
                      </p>
                    </div>
                    <ActionForm action={deleteSession} submit="Remover atividade" quiet confirmText={impact ?? 'Remover esta atividade?'} className="mt-4">
                      <input type="hidden" name="id" value={s.id} />
                    </ActionForm>
                  </Editable>
                </li>
              ))}
            </ul>
            {!d.sessions.length ? <p className="mt-2 text-sm text-muted">Sem atividades: o aluno vê “Programação em definição”.</p> : null}
            <div className="mt-3">
              <AddPanel label="Adicionar atividade">
                <ActionForm action={saveSession} submit="Adicionar">
                  <input type="hidden" name="dia" value={d.id} />
                  <SessionFields />
                </ActionForm>
              </AddPanel>
            </div>
          </div>
        ))}
        <AddPanel label="Adicionar dia">
          <ActionForm action={saveDay} row submit="Adicionar" confirmText={impact}>
            <input type="hidden" name="modulo" value={m.id} />
            <Input label="Data" name="data" type="date" required />
            <Input label="Rótulo" name="rotulo" placeholder={`Dia ${m.days.length + 1}`} defaultValue={`Dia ${m.days.length + 1}`} />
          </ActionForm>
        </AddPanel>
      </Block>

      <Block index="03" title="Antes do módulo" hint="Preparação pré-módulo: texto de orientação e aulas, links, arquivos ou textos. Rascunhos e itens com liberação futura não aparecem para o aluno.">
        <ActionForm action={updateModuleInfo}>
          <input type="hidden" name="id" value={m.id} />
          <TextArea label="Orientação de preparação" name="preparacao" rows={3} defaultValue={m.preparation ?? ''} />
        </ActionForm>
        {resourceList(before, 'antes')}
      </Block>

      <Block index="04" title="Materiais necessários" hint="Lista que o aluno marca ao separar o material. Grupos livres; pode indicar o dia.">
        {detail.materials.length ? (
          <ul className="space-y-2">
            {detail.materials.map((mat) => (
              <li key={mat.id}>
                <Editable
                  summary={
                    <span className="block text-sm">
                      <span className="eyebrow mr-2">{mat.group}</span>
                      <span className="font-semibold">{mat.item}</span>
                      {!mat.required ? <span className="ml-2 text-xs text-muted">opcional</span> : null}
                    </span>
                  }
                >
                  <ActionForm action={saveMaterial}>
                    <input type="hidden" name="id" value={mat.id} />
                    <MaterialFields days={m.days} mat={mat} />
                  </ActionForm>
                  <ActionForm action={deleteMaterial} submit="Remover item" quiet className="mt-3">
                    <input type="hidden" name="id" value={mat.id} />
                  </ActionForm>
                </Editable>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nenhum material cadastrado.</p>
        )}
        <AddPanel label="Adicionar item">
          <ActionForm action={saveMaterial} submit="Adicionar">
            <input type="hidden" name="modulo" value={m.id} />
            <MaterialFields days={m.days} />
          </ActionForm>
        </AddPanel>
        <ActionForm action={updateModuleInfo}>
          <input type="hidden" name="id" value={m.id} />
          <TextArea label="Observações da coordenação (visíveis ao aluno)" hint="Uma observação por linha." name="obs_materiais" rows={2} defaultValue={m.materialsNotes ?? ''} />
        </ActionForm>
      </Block>

      <Block index="05" title="Durante e depois" hint="Slides, PDFs, gravações e referências. Use “Liberar a partir de” para mostrar só depois da aula.">
        {resourceList(after, 'durante')}
      </Block>

      <Block index="06" title="Entregas" hint="Tarefas do aluno ligadas ao módulo. Com prazo, aparecem também no calendário.">
        {detail.deliverables.length ? (
          <ul className="space-y-2">
            {detail.deliverables.map((d) => (
              <li key={d.id}>
                <Editable
                  summary={
                    <span className="block text-sm">
                      <span className="font-semibold">{d.title}</span>
                      <span className="ml-2 text-xs text-muted">
                        {PHASE_LABEL[d.phase]}
                        {d.dueDate ? ` · prazo ${formatDayMonth(d.dueDate)}` : ''}
                      </span>
                    </span>
                  }
                >
                  <ActionForm action={saveDeliverable}>
                    <input type="hidden" name="id" value={d.id} />
                    <DeliverableFields d={d} />
                  </ActionForm>
                  <ActionForm action={deleteDeliverable} submit="Remover entrega" quiet className="mt-3">
                    <input type="hidden" name="id" value={d.id} />
                  </ActionForm>
                </Editable>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nenhuma entrega cadastrada.</p>
        )}
        <AddPanel label="Adicionar entrega">
          <ActionForm action={saveDeliverable} submit="Adicionar">
            <input type="hidden" name="modulo" value={m.id} />
            <DeliverableFields />
          </ActionForm>
        </AddPanel>
      </Block>

      <Block index="07" title="Equipe do módulo" hint="Professor principal, equipe clínica, coordenação e apoio. Desmarque “visível” para quem é só interno.">
        {m.staff.length ? (
          <ul className="space-y-2">
            {m.staff.map((s) => (
              <li key={s.id} className="rounded-2xl border border-rule bg-surface px-4 py-3">
                <ActionForm action={saveStaff} row submit="Salvar">
                  <input type="hidden" name="id" value={s.id} />
                  <span className="min-w-[10rem] self-center text-sm font-semibold">{s.faculty.name}</span>
                  <Select label="Papel" name="papel" defaultValue={s.role} options={STAFF_OPTIONS} className="min-w-[12rem]" />
                  <Check label="visível ao aluno" name="visivel" defaultChecked={s.visible} />
                  <Check label="a confirmar" name="a_confirmar" defaultChecked={s.tentative} />
                </ActionForm>
                <ActionForm action={removeStaff} submit="Remover da equipe" quiet className="mt-1">
                  <input type="hidden" name="id" value={s.id} />
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Ninguém na equipe deste módulo.</p>
        )}
        <AddPanel label="Adicionar à equipe">
          <ActionForm action={saveStaff} row submit="Adicionar">
            <input type="hidden" name="modulo" value={m.id} />
            <Select label="Pessoa" name="docente" options={facultyOptions.filter(([fid]) => !staffIds.has(fid))} className="min-w-[16rem] flex-1" />
            <Select label="Papel" name="papel" defaultValue="equipe_clinica" options={STAFF_OPTIONS} />
            <Check label="visível ao aluno" name="visivel" defaultChecked />
            <Check label="a confirmar" name="a_confirmar" />
          </ActionForm>
        </AddPanel>
      </Block>

      <Block index="08" title="Observações internas" hint="Só admin e coordenação veem. Nunca aparece para o aluno.">
        <ActionForm action={saveInternalNotes}>
          <input type="hidden" name="modulo" value={m.id} />
          <TextArea label="Observações" name="notas" rows={5} defaultValue={internalNotes} />
        </ActionForm>
      </Block>

      <Block index="09" title="Histórico" hint="Quem alterou, quando e o que mudou (últimas 40 alterações).">
        {history.length ? (
          <ol className="divide-y divide-rule rounded-2xl border border-rule bg-surface">
            {history.map((h) => (
              <li key={h.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[9rem_1fr]">
                <span className="num text-xs text-muted">{dateTime.format(new Date(h.at))}</span>
                <span className="min-w-0">
                  <span className="font-semibold">{h.actor}</span> · {h.table} · <span className="text-ink-2">{describeChange(h)}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">Sem alterações registradas.</p>
        )}
      </Block>
    </div>
  )
}

function MaterialFields({ days, mat }: { days: AdminModulePage['detail']['module']['days']; mat?: AdminModulePage['detail']['materials'][number] }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Grupo" name="grupo" defaultValue={mat?.group ?? 'Geral'} placeholder="Clínica, Hands-on, Estudo…" />
        <Select
          label="Dia (opcional)"
          name="dia"
          defaultValue={mat?.dayId ?? ''}
          options={[['', 'Todos os dias'], ...days.map((d, i) => [d.id, `Dia ${i + 1} · ${formatDayMonth(d.date)}`] as [string, string])]}
        />
      </div>
      <Input label="Item" name="item" required defaultValue={mat?.item} />
      <Input label="Observação (opcional)" name="nota" defaultValue={mat?.note ?? ''} />
      <Check label="opcional" name="opcional" defaultChecked={mat ? !mat.required : false} />
    </>
  )
}

function DeliverableFields({ d }: { d?: AdminModulePage['detail']['deliverables'][number] }) {
  return (
    <>
      <Input label="Entrega" name="titulo" required defaultValue={d?.title} />
      <TextArea label="Detalhes (opcional)" name="descricao" rows={2} defaultValue={d?.description ?? ''} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Quando" name="fase" defaultValue={d?.phase ?? 'durante'} options={[['antes', 'Antes do módulo'], ['durante', 'Durante'], ['depois', 'Depois']]} />
        <Input label="Prazo (opcional)" name="prazo" type="date" defaultValue={d?.dueDate ?? ''} />
      </div>
    </>
  )
}
