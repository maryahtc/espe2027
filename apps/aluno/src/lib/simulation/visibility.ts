/**
 * O que um aluno (matrícula ativa) de uma turma enxerga — as mesmas regras da RLS, aplicadas no servidor
 * durante a simulação. A conta Admin lê mais coisas (rascunhos, equipe oculta, conteúdo ainda não liberado);
 * aqui isso é recortado para ficar exatamente como o aluno veria. Funções puras.
 */

/** content_readable para aluno: publicado, já liberado e da turma (sem turmas = toda matrícula ativa). */
export function contentVisible(c: { status: string; availableFrom: string | null; cohortIds: string[] }, cohortId: string, now = new Date()): boolean {
  return (
    c.status === 'publicado' &&
    (!c.availableFrom || new Date(c.availableFrom) <= now) &&
    (c.cohortIds.length === 0 || c.cohortIds.includes(cohortId))
  )
}

/** resource_readable para aluno: publicado e já liberado (o módulo já foi conferido). */
export function resourceVisible(r: { status: string; availableFrom: string | null }, now = new Date()): boolean {
  return r.status === 'publicado' && (!r.availableFrom || new Date(r.availableFrom) <= now)
}

/** announcements_select para aluno: publicado, no período (hoje em SP) e da turma ou "todas". */
export function announcementVisible(a: { status: string; cohortId: string | null; visibleFrom: string; visibleUntil: string }, cohortId: string, today: string): boolean {
  return a.status === 'publicado' && a.visibleFrom <= today && a.visibleUntil >= today && (a.cohortId === null || a.cohortId === cohortId)
}
