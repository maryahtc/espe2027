/**
 * Vocabulários controlados. A planilha pode escrever de várias formas
 * ("Hands on", "hands-on", "HANDS ON"); aqui mapeamos para um valor único.
 * Chaves de `aliases` já estão normalizadas (minúsculas, sem acento, sem pontuação).
 */

export const CLASS_TYPES = {
  teorica: { label: 'Teórica', aliases: ['teorica', 'teoria', 'aula teorica'] },
  laboratorial: { label: 'Laboratorial', aliases: ['laboratorial', 'laboratorio', 'lab'] },
  clinica: { label: 'Clínica', aliases: ['clinica', 'atendimento clinico', 'pratica clinica'] },
  'hands-on': { label: 'Hands-on', aliases: ['hands on', 'handson', 'teoria e hands on', 'pratica'] },
  demonstracao: { label: 'Demonstração', aliases: ['demonstracao', 'demo', 'live'] },
  'discussao-de-caso': {
    label: 'Discussão de caso',
    aliases: ['discussao de caso', 'discussao de casos', 'caso clinico', 'casos clinicos'],
  },
  outro: { label: 'Outro', aliases: ['outro', 'outros'] },
} as const
export type ClassType = keyof typeof CLASS_TYPES

export const PERIODS = {
  manha: { label: 'Manhã', order: 1, aliases: ['manha', 'm'] },
  tarde: { label: 'Tarde', order: 2, aliases: ['tarde', 't'] },
  noite: { label: 'Noite', order: 3, aliases: ['noite', 'n'] },
  integral: { label: 'Dia inteiro', order: 0, aliases: ['integral', 'dia inteiro', 'dia todo'] },
} as const
export type Period = keyof typeof PERIODS

/** Status editorial de módulos e aulas. "rascunho" nunca é publicado. */
export const PUBLICATION_STATUS = {
  confirmado: { aliases: ['confirmado', 'confirmada', 'ok', 'fechado', 'fechada'] },
  'a-confirmar': {
    aliases: ['a confirmar', 'previsto', 'prevista', 'pendente', 'em aberto', 'provisorio', 'provisoria'],
  },
  rascunho: { aliases: ['rascunho', 'nao publicar', 'oculto', 'oculta', 'cancelado', 'cancelada'] },
} as const
export type PublicationStatus = keyof typeof PUBLICATION_STATUS

export const AVAILABILITY_STATUS = {
  ok: { label: 'OK', tone: 'ok' },
  atencao: { label: 'Atenção', tone: 'warn' },
  'sem-dados': { label: 'Sem dados', tone: 'muted' },
} as const
export type AvailabilityStatus = keyof typeof AVAILABILITY_STATUS

export const INVENTORY_STATUS = {
  ok: { label: 'OK', tone: 'ok' },
  baixo: { label: 'Baixo', tone: 'warn' },
  insuficiente: { label: 'Insuficiente', tone: 'danger' },
  'sem-dados': { label: 'Sem dados', tone: 'muted' },
} as const
export type InventoryStatus = keyof typeof INVENTORY_STATUS

export type StatusTone = 'ok' | 'warn' | 'danger' | 'muted'
