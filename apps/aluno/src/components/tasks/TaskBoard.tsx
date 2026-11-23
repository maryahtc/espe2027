import { cn } from '@portal/ui/cn'
import { EmptyState } from '@portal/ui/empty-state'
import { PageTitle } from '@portal/ui/section'
import Link from 'next/link'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { Input, Select, TextArea } from '@/components/admin/academic/ui'
import { formatDayMonth, relativeDays, year } from '@/lib/dates'
import { saveTask, setTaskStatus } from '@/lib/tasks/actions'
import type { TaskBoardData } from '@/lib/tasks/load'
import {
  CATEGORIES,
  CATEGORY_LABEL,
  canEditTask,
  dependencyGroups,
  filterTasks,
  isOpen,
  isOverdue,
  missingQuantity,
  parseFilters,
  PRIORITIES,
  PRIORITY_LABEL,
  sortTasks,
  STATUSES,
  STATUS_LABEL,
  type TaskVM,
  taskCounts,
} from '@/lib/tasks/model'

/**
 * Quadro único de pendências e providências (Bloco A · B2). Mesmo componente para Admin e coordenação; o que cada um
 * vê e pode fazer vem do banco (RLS). Coordenação: gerais só leitura. Ninguém exclui (encerrar = "Cancelada").
 * Nunca aparece para alunos.
 */

type SP = Record<string, string | undefined>
const fmt = (d: string) => `${formatDayMonth(d)}/${year(d)}`
const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`

function TaskFields({ data, task, defaults }: { data: TaskBoardData; task?: TaskVM; defaults?: { moduleId?: string; cohortId?: string } }) {
  const cohortOptions: Array<[string, string]> = [
    ...(data.admin ? ([['', 'Geral (sem turma)']] as Array<[string, string]>) : []),
    ...data.cohorts.map((c) => [c.id, c.name] as [string, string]),
  ]
  const cohortName = new Map(data.cohorts.map((c) => [c.id, c.name]))
  const moduleOptions: Array<[string, string]> = [
    ['', 'Sem módulo'],
    ...data.modules.map((m) => [m.id, data.cohorts.length > 1 ? `${cohortName.get(m.cohortId) ?? ''} · ${m.label}` : m.label] as [string, string]),
  ]
  const people = data.people.filter((p) => p.active || p.id === task?.responsibleId)
  const academic = people.filter((p) => p.group === 'academica')
  const operational = people.filter((p) => p.group === 'operacional')
  const depGroups = dependencyGroups(data.tasks, { current: task, isAdmin: data.admin })
  const moduleDefault = task?.moduleId ?? defaults?.moduleId ?? ''
  const cohortDefault =
    task?.cohortId ?? defaults?.cohortId ?? (moduleDefault ? data.modules.find((m) => m.id === moduleDefault)?.cohortId : undefined) ?? (data.admin ? '' : (data.cohorts[0]?.id ?? ''))
  return (
    <>
      {task ? <input type="hidden" name="id" value={task.id} /> : null}
      <Input label="Demanda" name="demanda" required maxLength={200} defaultValue={task?.title} placeholder="Ex.: Confirmar microscópios para o Módulo 9" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Categoria" name="categoria" defaultValue={task?.category ?? 'administrativo'} options={CATEGORIES.map((c) => [c, CATEGORY_LABEL[c]])} />
        <Select label="Prioridade" name="prioridade" defaultValue={task?.priority ?? 'media'} options={PRIORITIES.map((p) => [p, PRIORITY_LABEL[p]])} />
        <Select label="Situação" name="situacao" defaultValue={task?.status ?? 'aberta'} options={STATUSES.map((s) => [s, STATUS_LABEL[s]])} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Turma" name="turma" defaultValue={cohortDefault} options={cohortOptions} />
        <Select label="Módulo (opcional)" name="modulo" defaultValue={moduleDefault} options={moduleOptions} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-semibold">Responsável</span>
          <select name="responsavel" defaultValue={task?.responsibleId ?? ''} className="field mt-1.5 block min-h-11 w-full px-3 text-[15px]" data-responsavel-select>
            <option value="">Sem responsável</option>
            {operational.length ? (
              <optgroup label="Equipe operacional" data-grupo-responsavel="operacional">
                {operational.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label="Equipe acadêmica" data-grupo-responsavel="academica">
              {academic.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <Input label="Prazo (opcional)" name="prazo" type="date" defaultValue={task?.dueDate ?? ''} />
      </div>
      <Input label="Próxima ação (opcional)" name="proxima_acao" maxLength={500} defaultValue={task?.nextAction ?? ''} />
      <TextArea label="Detalhes (opcional)" name="detalhes" rows={2} maxLength={4000} defaultValue={task?.details ?? ''} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-semibold">Depende de (opcional)</span>
          <span className="mt-0.5 block text-xs text-muted">{task ? 'Só pendências em aberto da mesma turma.' : 'Precisa ser da mesma turma escolhida acima.'}</span>
          <select name="depende_de" defaultValue={task?.dependsOnId ?? ''} className="field mt-1.5 block min-h-11 w-full px-3 text-[15px]" data-depende-de>
            <option value="">Nenhuma</option>
            {depGroups.map((g) => (
              <optgroup key={g.cohortId ?? 'geral'} label={g.label} data-grupo-turma={g.cohortId ?? 'geral'}>
                {g.tasks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <Input label="Dependência externa (opcional)" name="dependencia" maxLength={500} defaultValue={task?.dependencyNote ?? ''} placeholder="Ex.: resposta da empresa" />
      </div>
      <details className="rounded-2xl border border-rule px-4 py-3" open={!!(task?.quantityNeeded != null || task?.partnerName || task?.linkUrl)}>
        <summary className="cursor-pointer text-sm font-semibold">Materiais, equipamentos, empresa e link</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input label="Qtd. necessária" name="qtd_necessaria" inputMode="decimal" defaultValue={task?.quantityNeeded ?? ''} />
          <Input label="Qtd. disponível" name="qtd_disponivel" inputMode="decimal" defaultValue={task?.quantityAvailable ?? ''} />
          <Input label="Empresa / parceiro" name="empresa" maxLength={200} defaultValue={task?.partnerName ?? ''} />
          <Input label="Link (https://)" name="link" type="url" maxLength={500} defaultValue={task?.linkUrl ?? ''} placeholder="Pasta de fotos, proposta, pedido…" />
        </div>
      </details>
    </>
  )
}

function Chip({ children, tone = 'muted', ...rest }: { children: React.ReactNode; tone?: 'muted' | 'strong' | 'alert' } & Record<string, unknown>) {
  return (
    <span
      {...rest}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
        tone === 'alert' ? 'border-[var(--brand)] text-[var(--brand)]' : tone === 'strong' ? 'border-rule-strong text-ink' : 'border-rule text-muted',
      )}
    >
      {children}
    </span>
  )
}

function TaskItem({ task, data, today }: { task: TaskVM; data: TaskBoardData; today: string }) {
  const editable = canEditTask(task, data.admin)
  const late = isOverdue(task, today)
  const missing = missingQuantity(task)
  const where = [task.cohortName && data.cohorts.length > 1 ? task.cohortName : null, task.moduleLabel].filter(Boolean).join(' · ') || (task.cohortId ? null : 'Geral')
  return (
    <li
      className="glass rounded-2xl p-4 sm:p-5"
      data-pendencia={task.id}
      data-categoria={task.category}
      data-situacao={task.status}
      data-atrasada={late ? '1' : '0'}
      data-somente-leitura={editable ? undefined : '1'}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className={cn('text-[15px] leading-snug font-semibold break-words', !isOpen(task) && 'text-muted line-through decoration-1')} data-titulo>
            {task.title}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip>{CATEGORY_LABEL[task.category]}</Chip>
            <Chip tone={task.status === 'concluida' ? 'muted' : 'strong'}>{STATUS_LABEL[task.status]}</Chip>
            {task.priority === 'alta' && isOpen(task) ? <Chip tone="strong">Prioridade alta</Chip> : null}
            {late ? (
              <Chip tone="alert" data-chip-atrasada>
                Atrasada
              </Chip>
            ) : null}
            {editable ? null : <Chip>Geral · somente leitura</Chip>}
          </div>
        </div>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {where ? (
          <div className="flex gap-2">
            <dt className="text-muted">Onde</dt>
            <dd>{where}</dd>
          </div>
        ) : null}
        <div className="flex gap-2">
          <dt className="text-muted">Responsável</dt>
          <dd data-responsavel>{task.responsibleName ?? '—'}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted">Prazo</dt>
          <dd className="num" data-prazo={task.dueDate ?? ''}>
            {task.dueDate ? `${fmt(task.dueDate)} (${relativeDays(today, task.dueDate)})` : '—'}
          </dd>
        </div>
        {task.nextAction ? (
          <div className="flex gap-2 sm:col-span-2">
            <dt className="text-muted">Próxima ação</dt>
            <dd className="min-w-0 break-words">{task.nextAction}</dd>
          </div>
        ) : null}
        {task.dependsOnTitle || task.dependencyNote ? (
          <div className="flex gap-2 sm:col-span-2">
            <dt className="text-muted">Depende de</dt>
            <dd className="min-w-0 break-words">{[task.dependsOnTitle, task.dependencyNote].filter(Boolean).join(' · ')}</dd>
          </div>
        ) : null}
        {task.quantityNeeded != null || task.quantityAvailable != null ? (
          <div className="flex gap-2 sm:col-span-2" data-quantidades>
            <dt className="text-muted">Quantidade</dt>
            <dd className="num">
              {task.quantityNeeded ?? '—'} necessária · {task.quantityAvailable ?? '—'} disponível
              {missing != null ? <span className={cn(missing > 0 && 'font-semibold')}> · faltam {missing}</span> : null}
            </dd>
          </div>
        ) : null}
        {task.partnerName ? (
          <div className="flex gap-2">
            <dt className="text-muted">Empresa</dt>
            <dd className="min-w-0 break-words">{task.partnerName}</dd>
          </div>
        ) : null}
        {task.linkUrl ? (
          <div className="flex gap-2">
            <dt className="text-muted">Link</dt>
            <dd className="min-w-0 truncate">
              <a href={task.linkUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                Abrir
              </a>
            </dd>
          </div>
        ) : null}
      </dl>
      {task.details ? <p className="mt-2 text-sm whitespace-pre-line text-ink-2">{task.details}</p> : null}
      {editable ? (
        <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2 border-t border-rule pt-3">
          <ActionForm action={setTaskStatus} row submit="Atualizar" silent className="gap-2">
            <input type="hidden" name="id" value={task.id} />
            <label className="sr-only" htmlFor={`sit-${task.id}`}>
              Situação
            </label>
            <select id={`sit-${task.id}`} name="situacao" defaultValue={task.status} className="field min-h-10 px-2 text-sm" data-trocar-situacao>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </ActionForm>
          <details className="w-full" data-editar>
            <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-ink">Editar</summary>
            <ActionForm action={saveTask} submit="Salvar alterações" className="mt-3">
              <TaskFields data={data} task={task} />
            </ActionForm>
          </details>
        </div>
      ) : null}
    </li>
  )
}

export function TaskBoard({ data, sp, path, eyebrow, today }: { data: TaskBoardData; sp: SP; path: string; eyebrow: string; today: string }) {
  const f = parseFilters(sp)
  const counts = taskCounts(data.tasks, today)
  const shown = sortTasks(filterTasks(data.tasks, f, today), today)
  const link = (q: Record<string, string>) => `${path}?${new URLSearchParams(q)}`
  const cohortFilter: Array<[string, string]> = [
    ['', 'Todas'],
    ['geral', 'Geral (sem turma)'],
    ...data.cohorts.map((c) => [c.id, c.name] as [string, string]),
  ]
  const usedPeople = new Set(data.tasks.map((t) => t.responsibleId).filter(Boolean))
  return (
    <div data-quadro>
      <PageTitle
        eyebrow={eyebrow}
        title="Pendências"
        lead="Quadro único de pendências e providências: professores, materiais, equipamentos, parceiros, foto e vídeo, marketing e experiência do aluno."
      />
      <p className="-mt-4 mb-6 text-xs text-muted" data-regra-encerrar>
        Pendências não são excluídas: para encerrar, marque como Concluída ou Cancelada. O histórico fica guardado.
        {data.admin ? '' : ' As pendências gerais (sem turma) aparecem aqui só para leitura.'}
      </p>

      <nav aria-label="Resumo" className="flex flex-wrap gap-2 text-sm" data-contagens>
        {(
          [
            ['abertas', 'em aberto', counts.open, link({})],
            ['atrasadas', counts.overdue === 1 ? 'atrasada' : 'atrasadas', counts.overdue, link({ atrasadas: '1' })],
            ['alta', 'prioridade alta', counts.highPriority, link({ prioridade: 'alta' })],
            ['aguardando', 'aguardando', counts.waiting, link({ situacao: 'aguardando' })],
          ] as const
        ).map(([k, label, v, href]) => (
          <Link key={k} href={href} className="glass inline-flex min-h-10 items-center gap-1.5 rounded-full px-4" data-contagem={k}>
            <span className="num font-semibold" data-valor>
              {v}
            </span>
            <span className="text-muted">{label}</span>
          </Link>
        ))}
      </nav>

      <details className="glass mt-6 rounded-2xl p-4 sm:p-5" open={sp.novo === '1'} data-nova-pendencia>
        <summary className="cursor-pointer text-[15px] font-semibold">+ Nova pendência</summary>
        <ActionForm action={saveTask} submit="Criar pendência" variant="primary" className="mt-4">
          <TaskFields data={data} defaults={{ moduleId: f.moduleId, cohortId: typeof f.cohortId === 'string' && f.cohortId !== 'geral' ? f.cohortId : undefined }} />
        </ActionForm>
      </details>

      <form action={path} className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" data-filtros-pendencias>
        <Select label="Situação" name="situacao" defaultValue={sp.situacao ?? 'abertas'} options={[['abertas', 'Em aberto'], ['todas', 'Todas'], ...STATUSES.map((s) => [s, STATUS_LABEL[s]] as [string, string])]} />
        <Select label="Categoria" name="categoria" defaultValue={f.category ?? ''} options={[['', 'Todas'], ...CATEGORIES.map((c) => [c, CATEGORY_LABEL[c]] as [string, string])]} />
        <Select label="Prioridade" name="prioridade" defaultValue={f.priority ?? ''} options={[['', 'Todas'], ...PRIORITIES.map((p) => [p, PRIORITY_LABEL[p]] as [string, string])]} />
        <Select label="Turma" name="turma" defaultValue={typeof f.cohortId === 'string' ? f.cohortId : ''} options={cohortFilter} />
        <Select label="Módulo" name="modulo" defaultValue={f.moduleId ?? ''} options={[['', 'Todos'], ...data.modules.map((m) => [m.id, m.label] as [string, string])]} />
        <Select
          label="Responsável"
          name="responsavel"
          defaultValue={f.responsibleId ?? ''}
          options={[['', 'Todos'], ...data.people.filter((p) => usedPeople.has(p.id)).map((p) => [p.id, p.name] as [string, string])]}
        />
        <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm sm:col-span-1">
          <input type="checkbox" name="atrasadas" value="1" defaultChecked={!!f.overdue} className="size-4 accent-[var(--brand)]" /> Só atrasadas
        </label>
        <div className="col-span-2 flex items-end gap-3 sm:col-span-2 lg:col-span-5">
          <button type="submit" className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-on-ink">
            Filtrar
          </button>
          <Link href={path} className="min-h-11 content-center text-sm text-muted hover:text-ink">
            Limpar filtros
          </Link>
        </div>
      </form>

      <p className="mt-6 text-sm text-muted" data-mostrando>
        {n(shown.length, 'pendência', 'pendências')}
      </p>
      {shown.length ? (
        <ul className="mt-3 space-y-3" data-lista-pendencias>
          {shown.map((t) => (
            <TaskItem key={t.id} task={t} data={data} today={today} />
          ))}
        </ul>
      ) : (
        <div className="mt-3" data-quadro-vazio>
          <EmptyState title={data.tasks.length ? 'Nenhuma pendência com estes filtros' : 'Nenhuma pendência cadastrada'}>
            {data.tasks.length ? 'Ajuste os filtros ou limpe-os para ver tudo.' : 'Use "+ Nova pendência" para registrar a primeira.'}
          </EmptyState>
        </div>
      )}
    </div>
  )
}
