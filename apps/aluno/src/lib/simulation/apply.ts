import 'server-only'
import { randomUUID } from 'node:crypto'
import { cohortModules, today } from '@/lib/academic/load'
import { loadStepOptions, moduleSpans } from '@/lib/cases/load'
import { loadTaxonomy } from '@/lib/library/load'
import { type Simulation, updateSimulation } from './session'
import type { Ctx, SimState } from './state'

/** Contexto das regras (módulos publicados da turma, etapas do catálogo, temas ativos) — tudo lido, nada gravado. */
export async function simContext(sim: Simulation): Promise<Ctx> {
  const [modules, options, taxonomy] = await Promise.all([cohortModules(sim.cohortVM.id), loadStepOptions(), loadTaxonomy()])
  return {
    today: today(),
    now: new Date().toISOString(),
    modules: moduleSpans(modules),
    steps: new Map(options.map((o) => [o.stepId, { procedureId: o.procedureId, active: o.active, requiresDescription: o.requiresDescription }])),
    activeTopics: new Set(taxonomy.topics.filter((t) => !t.mergedInto).map((t) => t.id)),
    newId: randomUUID,
  }
}

/** Aplica uma mudança ao rascunho e grava o cookie. Erros de regra sobem como mensagem para a tela. */
export async function applySim<T>(sim: Simulation, change: (s: SimState, ctx: Ctx) => T): Promise<T> {
  const ctx = await simContext(sim)
  let out: T | undefined
  await updateSimulation(sim, (s) => {
    out = change(s, ctx)
  })
  return out as T
}
