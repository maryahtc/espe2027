import 'server-only'
import { cohortEvents, cohortModules, currentCohort, today, viewerCohorts } from './load'
import { courseMonth } from './model'

/** Tudo o que as telas do aluno precisam da turma atual (null = sem turma vinculada). */
export async function studentArea() {
  const cohort = await currentCohort()
  if (!cohort) return null
  const modules = await cohortModules(cohort.id)
  return { cohort, modules, cohorts: await viewerCohorts(), today: today(), month: courseMonth(cohort, today()) }
}

export async function studentCalendar() {
  const area = await studentArea()
  if (!area) return null
  const events = await cohortEvents(area.cohort.id, area.modules.map((m) => m.id))
  return { ...area, events }
}
