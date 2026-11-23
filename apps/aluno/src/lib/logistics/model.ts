/**
 * Bloco A · B1 — professores por módulo: participação, passagem e hospedagem. Regras puras, sem banco.
 * Situações independentes. "Resolvido" é fato objetivo (não há nota de pessoas): passagem comprada ou não precisa;
 * hospedagem reservada ou não precisa. "Aguardando confirmação" é o que depende de terceiros (UIOA, agência…).
 */

export const PARTICIPATION = ['a_convidar', 'convidado', 'confirmado', 'recusado', 'cancelado'] as const
export type Participation = (typeof PARTICIPATION)[number]
export const TRAVEL = ['nao_precisa', 'a_providenciar', 'aguardando_confirmacao', 'comprada', 'cancelada'] as const
export type Travel = (typeof TRAVEL)[number]
export const LODGING = ['nao_precisa', 'a_reservar', 'aguardando_confirmacao', 'reservada', 'cancelada'] as const
export type Lodging = (typeof LODGING)[number]

export const PARTICIPATION_LABEL: Record<Participation, string> = {
  a_convidar: 'A convidar',
  convidado: 'Convidado',
  confirmado: 'Confirmado',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
}
export const TRAVEL_LABEL: Record<Travel, string> = {
  nao_precisa: 'Não precisa',
  a_providenciar: 'A providenciar',
  aguardando_confirmacao: 'Aguardando confirmação',
  comprada: 'Comprada',
  cancelada: 'Cancelada',
}
export const LODGING_LABEL: Record<Lodging, string> = {
  nao_precisa: 'Não precisa',
  a_reservar: 'A reservar',
  aguardando_confirmacao: 'Aguardando confirmação',
  reservada: 'Reservada',
  cancelada: 'Cancelada',
}

export type Logistics = {
  /** null = professor está na programação/equipe do módulo, mas ainda sem registro de logística (valores padrão). */
  id: string | null
  moduleId: string
  facultyId: string
  participation: Participation
  invitedOn: string | null
  answeredOn: string | null
  travel: Travel
  travelArrival: string | null
  travelDeparture: string | null
  travelLocator: string | null
  travelReceiptUrl: string | null
  travelResponsible: string | null
  travelWaitingOn: string | null
  travelNotes: string | null
  lodging: Lodging
  lodgingName: string | null
  checkIn: string | null
  checkOut: string | null
  lodgingLocator: string | null
  lodgingReceiptUrl: string | null
  lodgingResponsible: string | null
  lodgingWaitingOn: string | null
  lodgingNotes: string | null
  notes: string | null
}

export const DEFAULT_LOGISTICS = (moduleId: string, facultyId: string): Logistics => ({
  id: null,
  moduleId,
  facultyId,
  participation: 'a_convidar',
  invitedOn: null,
  answeredOn: null,
  travel: 'a_providenciar',
  travelArrival: null,
  travelDeparture: null,
  travelLocator: null,
  travelReceiptUrl: null,
  travelResponsible: null,
  travelWaitingOn: null,
  travelNotes: null,
  lodging: 'a_reservar',
  lodgingName: null,
  checkIn: null,
  checkOut: null,
  lodgingLocator: null,
  lodgingReceiptUrl: null,
  lodgingResponsible: null,
  lodgingWaitingOn: null,
  lodgingNotes: null,
  notes: null,
})

/** Quem não vai participar (recusou ou foi cancelado) não conta nas pendências de passagem e hospedagem. */
export const isOut = (l: Pick<Logistics, 'participation'>) => l.participation === 'recusado' || l.participation === 'cancelado'
export const travelResolved = (l: Pick<Logistics, 'travel' | 'participation'>) => isOut(l) || l.travel === 'nao_precisa' || l.travel === 'comprada' || l.travel === 'cancelada'
export const lodgingResolved = (l: Pick<Logistics, 'lodging' | 'participation'>) => isOut(l) || l.lodging === 'nao_precisa' || l.lodging === 'reservada' || l.lodging === 'cancelada'
/** Depende de terceiros (UIOA, agência, hotel…): alguma providência está "aguardando confirmação". */
export const waitingOnOthers = (l: Pick<Logistics, 'travel' | 'lodging' | 'participation'>) =>
  !isOut(l) && (l.travel === 'aguardando_confirmacao' || l.lodging === 'aguardando_confirmacao')
/** Tudo resolvido para este professor neste módulo. */
export const allSet = (l: Logistics) => isOut(l) || (l.participation === 'confirmado' && travelResolved(l) && lodgingResolved(l))

export type LogisticsSummary = {
  teachers: number
  confirmed: number
  toConfirm: number
  out: number
  travelPending: number
  lodgingPending: number
  waiting: number
  done: number
}

export function summarize(list: Logistics[]): LogisticsSummary {
  const active = list.filter((l) => !isOut(l))
  return {
    teachers: list.length,
    confirmed: active.filter((l) => l.participation === 'confirmado').length,
    toConfirm: active.filter((l) => l.participation === 'a_convidar' || l.participation === 'convidado').length,
    out: list.length - active.length,
    travelPending: active.filter((l) => !travelResolved(l)).length,
    lodgingPending: active.filter((l) => !lodgingResolved(l)).length,
    waiting: active.filter(waitingOnOthers).length,
    done: list.filter(allSet).length,
  }
}

/** Professores de um módulo: equipe + atividades + quem já tem registro de logística (sem repetir). */
export function moduleTeachers(staffIds: string[], sessionIds: string[], logisticsIds: string[]): string[] {
  return [...new Set([...staffIds, ...sessionIds, ...logisticsIds])]
}

export type Situation = 'pendente' | 'aguardando' | 'resolvido'
/** Situação de uma linha para filtros e destaques. */
export function situation(l: Logistics): Situation {
  if (allSet(l)) return 'resolvido'
  if (waitingOnOthers(l)) return 'aguardando'
  return 'pendente'
}
