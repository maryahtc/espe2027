import { cn } from '@portal/ui/cn'
import { EmptyState } from '@portal/ui/empty-state'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { Input, Select, TextArea } from '@/components/admin/academic/ui'
import { formatDayMonth, year } from '@/lib/dates'
import { saveLogistics } from '@/lib/logistics/actions'
import type { LogisticsBoard as Board, ModuleLogistics, PersonOption, TeacherRow } from '@/lib/logistics/load'
import {
  isOut,
  LODGING,
  LODGING_LABEL,
  lodgingResolved,
  PARTICIPATION,
  PARTICIPATION_LABEL,
  situation,
  TRAVEL,
  TRAVEL_LABEL,
  travelResolved,
} from '@/lib/logistics/model'

/**
 * Professores e logística por módulo (Bloco A · B1): participação, passagem e hospedagem, com situações independentes.
 * Admin edita; coordenação consulta (o banco garante). Só lê a programação acadêmica.
 */

const d = (v: string | null) => (v ? `${formatDayMonth(v.slice(0, 10))}/${year(v.slice(0, 10))}` : null)
const dt = (v: string | null) => (v ? `${formatDayMonth(v.slice(0, 10))}${v.length > 10 ? ` ${v.slice(11, 16)}` : ''}` : null)
const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`

function Chip({ children, tone, ...rest }: { children: ReactNode; tone: 'ok' | 'pending' | 'waiting' | 'muted' } & Record<string, unknown>) {
  return (
    <span
      {...rest}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
        tone === 'ok' && 'border-rule text-ink-2',
        tone === 'pending' && 'border-rule-strong text-ink',
        tone === 'waiting' && 'border-[var(--brand)] text-[var(--brand)]',
        tone === 'muted' && 'border-rule text-muted',
      )}
    >
      {children}
    </span>
  )
}

function ResponsibleSelect({ name, value, people, label }: { name: string; value: string | null; people: PersonOption[]; label: string }) {
  const list = people.filter((p) => p.active || p.key === value)
  return (
    <label className="block">
      <span className="block text-sm font-semibold">{label}</span>
      <select name={name} defaultValue={value ?? ''} className="field mt-1.5 block min-h-11 w-full px-3 text-[15px]">
        <option value="">Sem responsável</option>
        {(['operacional', 'academica'] as const).map((g) =>
          list.some((p) => p.group === g) ? (
            <optgroup key={g} label={g === 'operacional' ? 'Equipe operacional' : 'Equipe acadêmica'}>
              {list
                .filter((p) => p.group === g)
                .map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
            </optgroup>
          ) : null,
        )}
      </select>
    </label>
  )
}

function LogisticsForm({ row, people }: { row: TeacherRow; people: PersonOption[] }) {
  const l = row.logistics
  return (
    <ActionForm action={saveLogistics} submit="Salvar logística" className="mt-3">
      <input type="hidden" name="modulo" value={l.moduleId} />
      <input type="hidden" name="professor" value={row.facultyId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Select label="Participação" name="participacao" defaultValue={l.participation} options={PARTICIPATION.map((p) => [p, PARTICIPATION_LABEL[p]])} />
        <Input label="Convidado em" name="convidado_em" type="date" defaultValue={l.invitedOn ?? ''} />
        <Input label="Respondeu em" name="respondeu_em" type="date" defaultValue={l.answeredOn ?? ''} />
      </div>
      <fieldset className="space-y-3 rounded-2xl border border-rule p-4" data-campos-passagem>
        <legend className="px-1 text-sm font-semibold">Passagem</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Situação" name="passagem" defaultValue={l.travel} options={TRAVEL.map((t) => [t, TRAVEL_LABEL[t]])} />
          <Input label="Chegada" name="chegada" type="datetime-local" defaultValue={l.travelArrival?.slice(0, 16) ?? ''} />
          <Input label="Saída" name="saida" type="datetime-local" defaultValue={l.travelDeparture?.slice(0, 16) ?? ''} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Localizador" name="localizador" maxLength={100} defaultValue={l.travelLocator ?? ''} />
          <Input label="Comprovante (link https://)" name="passagem_comprovante" type="url" maxLength={500} defaultValue={l.travelReceiptUrl ?? ''} />
          <ResponsibleSelect name="passagem_responsavel" label="Responsável pela providência" value={l.travelResponsible} people={people} />
          <Input label="Aguardando quem" name="passagem_aguardando" maxLength={200} defaultValue={l.travelWaitingOn ?? ''} placeholder="Ex.: UIOA, agência" />
        </div>
        <TextArea label="Observações da passagem" name="passagem_obs" rows={2} maxLength={1000} defaultValue={l.travelNotes ?? ''} />
      </fieldset>
      <fieldset className="space-y-3 rounded-2xl border border-rule p-4" data-campos-hospedagem>
        <legend className="px-1 text-sm font-semibold">Hospedagem</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Situação" name="hospedagem" defaultValue={l.lodging} options={LODGING.map((t) => [t, LODGING_LABEL[t]])} />
          <Input label="Check-in" name="check_in" type="date" defaultValue={l.checkIn ?? ''} />
          <Input label="Check-out" name="check_out" type="date" defaultValue={l.checkOut ?? ''} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Hotel" name="hotel" maxLength={200} defaultValue={l.lodgingName ?? ''} />
          <Input label="Número da reserva" name="reserva" maxLength={100} defaultValue={l.lodgingLocator ?? ''} />
          <Input label="Comprovante (link https://)" name="hospedagem_comprovante" type="url" maxLength={500} defaultValue={l.lodgingReceiptUrl ?? ''} />
          <ResponsibleSelect name="hospedagem_responsavel" label="Responsável pela providência" value={l.lodgingResponsible} people={people} />
          <Input label="Aguardando quem" name="hospedagem_aguardando" maxLength={200} defaultValue={l.lodgingWaitingOn ?? ''} placeholder="Ex.: UIOA, hotel" />
        </div>
        <TextArea label="Observações da hospedagem" name="hospedagem_obs" rows={2} maxLength={1000} defaultValue={l.lodgingNotes ?? ''} />
      </fieldset>
      <TextArea label="Observações gerais" name="obs" rows={2} maxLength={1000} defaultValue={l.notes ?? ''} />
    </ActionForm>
  )
}

function Row({ row, board, peopleName }: { row: TeacherRow; board: Board; peopleName: Map<string, string> }) {
  const l = row.logistics
  const out = isOut(l)
  const sit = situation(l)
  const tOk = travelResolved(l)
  const hOk = lodgingResolved(l)
  const where = [row.inStaff ? `Equipe: ${row.inStaff}` : null, row.inSessions ? n(row.inSessions, 'atividade', 'atividades') : null].filter(Boolean).join(' · ')
  const detail = (label: string, parts: Array<string | null>) => {
    const t = parts.filter(Boolean).join(' · ')
    return t ? (
      <p className="text-xs text-muted">
        <span className="font-semibold text-ink-2">{label}:</span> {t}
      </p>
    ) : null
  }
  return (
    <li className="py-4" data-professor={row.facultyId} data-situacao-logistica={sit}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="min-w-0 text-[15px] font-semibold break-words">
          {board.admin ? (
            <Link href={`/admin/professores/${row.facultyId}`} className="hover:underline" data-agenda>
              {row.name}
            </Link>
          ) : (
            row.name
          )}
          {row.fullName && row.fullName !== row.name ? <span className="font-normal text-muted"> · {row.fullName}</span> : null}
        </p>
        {where ? <span className="text-xs text-muted">{where}</span> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Chip tone={l.participation === 'confirmado' ? 'ok' : out ? 'muted' : 'pending'} data-participacao={l.participation}>
          {PARTICIPATION_LABEL[l.participation]}
        </Chip>
        {out ? null : (
          <>
            <Chip tone={l.travel === 'aguardando_confirmacao' ? 'waiting' : tOk ? 'ok' : 'pending'} data-passagem={l.travel}>
              Passagem: {TRAVEL_LABEL[l.travel]}
            </Chip>
            <Chip tone={l.lodging === 'aguardando_confirmacao' ? 'waiting' : hOk ? 'ok' : 'pending'} data-hospedagem={l.lodging}>
              Hospedagem: {LODGING_LABEL[l.lodging]}
            </Chip>
          </>
        )}
        {l.id ? null : <Chip tone="muted">sem registro</Chip>}
      </div>
      {out ? null : (
        <div className="mt-2 space-y-0.5">
          {detail('Passagem', [
            l.travelArrival ? `chegada ${dt(l.travelArrival)}` : null,
            l.travelDeparture ? `saída ${dt(l.travelDeparture)}` : null,
            l.travelLocator ? `localizador ${l.travelLocator}` : null,
            l.travelResponsible ? `resp. ${peopleName.get(l.travelResponsible) ?? '—'}` : null,
            l.travel === 'aguardando_confirmacao' && l.travelWaitingOn ? `aguardando ${l.travelWaitingOn}` : null,
          ])}
          {detail('Hospedagem', [
            l.lodgingName,
            l.checkIn ? `${d(l.checkIn)}${l.checkOut ? ` a ${d(l.checkOut)}` : ''}` : null,
            l.lodgingLocator ? `reserva ${l.lodgingLocator}` : null,
            l.lodgingResponsible ? `resp. ${peopleName.get(l.lodgingResponsible) ?? '—'}` : null,
            l.lodging === 'aguardando_confirmacao' && l.lodgingWaitingOn ? `aguardando ${l.lodgingWaitingOn}` : null,
          ])}
          {l.travelReceiptUrl || l.lodgingReceiptUrl ? (
            <p className="flex gap-3 text-xs">
              {l.travelReceiptUrl ? (
                <a href={l.travelReceiptUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                  Comprovante da passagem
                </a>
              ) : null}
              {l.lodgingReceiptUrl ? (
                <a href={l.lodgingReceiptUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                  Comprovante da hospedagem
                </a>
              ) : null}
            </p>
          ) : null}
        </div>
      )}
      {row.contact && (row.contact.city || row.contact.phone || row.contact.email) ? (
        <p className="mt-1.5 text-xs break-words text-ink-2" data-contato-professor>
          {[row.contact.city, row.contact.phone, row.contact.email].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      {l.notes ? <p className="mt-1 text-xs whitespace-pre-line text-muted">{l.notes}</p> : null}
      {board.admin ? (
        <details className="mt-2" data-editar-logistica>
          <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-ink">Atualizar participação e logística</summary>
          <LogisticsForm row={row} people={board.people} />
        </details>
      ) : null}
    </li>
  )
}

function ModuleCard({ m, board, filter, peopleName }: { m: ModuleLogistics; board: Board; filter: string; peopleName: Map<string, string> }) {
  const rows = m.rows.filter((r) => filter === 'todas' || situation(r.logistics) === filter)
  const s = m.summary
  return (
    <section className="glass rounded-2xl p-4 sm:p-5" data-modulo-logistica={m.id}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-semibold">
          {m.label}
          {m.title && !/^Módulo \d+$/.test(m.title) ? <span className="font-normal text-muted"> · {m.title}</span> : null}
        </h2>
        <span className="num text-sm text-muted">
          {m.start ? `${d(m.start)}${m.end && m.end !== m.start ? ` a ${d(m.end)}` : ''}` : 'datas a definir'}
          {board.cohorts.length > 1 ? ` · ${m.cohortName}` : ''}
        </span>
      </header>
      <p className="mt-1 text-xs text-muted" data-resumo-modulo>
        {s.confirmed} de {s.teachers - s.out} confirmados · passagens pendentes {s.travelPending} · hospedagens pendentes {s.lodgingPending}
        {s.waiting ? ` · ${s.waiting} aguardando terceiros` : ''}
      </p>
      {rows.length ? (
        <ul className="mt-2 divide-y divide-rule">
          {rows.map((r) => (
            <Row key={r.facultyId} row={r} board={board} peopleName={peopleName} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">{m.rows.length ? 'Nenhum professor com esta situação.' : 'Nenhum professor na programação ou na equipe deste módulo.'}</p>
      )}
    </section>
  )
}

export function LogisticsBoardView({ board, path, filter }: { board: Board; path: string; filter: string }) {
  const s = board.summary
  const peopleName = new Map(board.people.map((p) => [p.key, p.name]))
  const q = (extra: Record<string, string>) =>
    `${path}?${new URLSearchParams({ ...(board.cohortId ? { turma: board.cohortId } : {}), escopo: board.scope, ...extra })}`
  return (
    <div data-logistica>
      <nav aria-label="Resumo" className="flex flex-wrap gap-2 text-sm" data-resumo-logistica>
        {(
          [
            ['confirmados', `de ${s.teachers - s.out} confirmados`, s.confirmed, q({})],
            ['a-confirmar', 'a confirmar', s.toConfirm, q({ situacao: 'pendente' })],
            ['passagens', s.travelPending === 1 ? 'passagem pendente' : 'passagens pendentes', s.travelPending, q({ situacao: 'pendente' })],
            ['hospedagens', s.lodgingPending === 1 ? 'hospedagem pendente' : 'hospedagens pendentes', s.lodgingPending, q({ situacao: 'pendente' })],
            ['aguardando', 'aguardando terceiros', s.waiting, q({ situacao: 'aguardando' })],
          ] as const
        ).map(([k, label, v, href]) => (
          <Link key={k} href={href} className="glass inline-flex min-h-10 items-center gap-1.5 rounded-full px-4" data-contagem-logistica={k}>
            <span className="num font-semibold" data-valor>
              {v}
            </span>
            <span className="text-muted">{label}</span>
          </Link>
        ))}
      </nav>

      <form action={path} className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" data-filtros-logistica>
        {board.cohorts.length > 1 ? (
          <Select label="Turma" name="turma" defaultValue={board.cohortId ?? ''} options={[['', 'Todas'], ...board.cohorts.map((c) => [c.id, c.name] as [string, string])]} />
        ) : null}
        <Select
          label="Módulos"
          name="escopo"
          defaultValue={board.scope}
          options={[
            ['proximos', 'Próximos 4'],
            ['futuros', 'Todos os futuros'],
            ['todos', 'Todos (com passados)'],
          ]}
        />
        <Select
          label="Situação"
          name="situacao"
          defaultValue={filter}
          options={[
            ['todas', 'Todas'],
            ['pendente', 'Com pendência'],
            ['aguardando', 'Aguardando terceiros'],
            ['resolvido', 'Resolvidas'],
          ]}
        />
        <div className="col-span-2 flex items-end gap-3 sm:col-span-1">
          <button type="submit" className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-on-ink">
            Filtrar
          </button>
        </div>
      </form>

      {board.modules.length ? (
        <div className="mt-6 space-y-4" data-lista-modulos-logistica>
          {board.modules.map((m) => (
            <ModuleCard key={m.id} m={m} board={board} filter={filter} peopleName={peopleName} />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState title="Nenhum módulo neste filtro">Mude o período ou a turma para ver outros módulos.</EmptyState>
        </div>
      )}
    </div>
  )
}
