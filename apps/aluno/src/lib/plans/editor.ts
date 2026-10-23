import 'server-only'
import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/session'
import { canRegister, loadMyCase, loadMyCases, loadStepOptions } from '@/lib/cases/load'
import { odontogramReady } from '@/lib/cases/schema'
import { getSimulation } from '@/lib/simulation/session'
import { guardStudentPage } from '@/lib/simulation/guard'
import { loadMyPlan } from './load'
import { displayOrder } from './model'

/**
 * Tudo o que o editor da consulta planejada precisa. Planejamento desativado (banco sem a migração) → 404, sem
 * consultar as tabelas novas. Caso concluído, excluído ou turma encerrada → volta ao caso (somente leitura).
 */
export async function planEditorData(caseId: string, visitId?: string) {
  await guardStudentPage()
  const auth = await requireUser()
  if (!auth) notFound()
  const plan = await loadMyPlan(caseId)
  if (!plan) notFound()
  const c = await loadMyCase(caseId, auth.userId)
  if (!c) notFound()
  if (c.removed || c.status !== 'em_andamento' || !(await canRegister(c.cohortId))) redirect(`/casos/${caseId}#planejamento`)
  const ordered = displayOrder(plan)
  const visit = visitId ? ordered.find((v) => v.id === visitId) : undefined
  if (visitId && (!visit || visit.realizedOn)) redirect(`/casos/${caseId}#planejamento`)
  const [options, archSupported, sim] = await Promise.all([loadStepOptions(), odontogramReady(), getSimulation()])
  // Acesso rápido: histórico real do aluno (na simulação, só os atalhos padrão — como no registro).
  const history = sim ? [] : (await loadMyCases(auth.userId)).flatMap((x) => x.records.filter((r) => !r.removed).map((r) => ({ stepId: r.stepId, createdAt: r.createdAt })))
  const number = visit ? visit.number : ordered.filter((v) => !v.realizedOn).length + 1
  return { c, visit, options, archSupported, history, title: `Consulta planejada ${number}` }
}
