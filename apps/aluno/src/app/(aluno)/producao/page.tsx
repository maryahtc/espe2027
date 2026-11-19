import { ButtonLink } from '@portal/ui/button'
import { EmptyState } from '@portal/ui/empty-state'
import { IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import { PeriodFilters } from '@/components/production/PeriodFilters'
import { ProductionReport } from '@/components/production/ProductionReport'
import { studentArea } from '@/lib/academic/student'
import { requireUser } from '@/lib/auth/session'
import { canRegister } from '@/lib/cases/load'
import { libraryForProcedures, loadProduction } from '@/lib/production/load'
import { exploreAreas } from '@/lib/production/model'
import { resolvePeriod } from '@/lib/production/period'
import { guardStudentPage } from '@/lib/simulation/guard'
import { getSimulation } from '@/lib/simulation/session'

export const metadata: Metadata = { title: 'Minha produção' }

/**
 * Minha Produção (Etapa 7): a própria formação clínica do aluno, derivada dos registros da Etapa 6 (nada gravado,
 * nada fictício, sem comparação, ranking, meta ou IA). Só o aluno vê; na simulação, o rascunho.
 */
export default async function ProductionPage({ searchParams }: { searchParams: Promise<{ filtro?: string; de?: string; ate?: string }> }) {
  await guardStudentPage()
  const auth = await requireUser()
  const area = await studentArea()
  if (!auth || !area) {
    return <EmptyState title="Minha produção">Assim que sua conta estiver vinculada a uma turma, sua produção aparece aqui.</EmptyState>
  }
  // Só o aluno (ou o Admin no Modo de simulação). A coordenação/Admin acompanha pela Visão da turma (Etapa 10).
  if (auth.role !== 'aluno' && !(await getSimulation())) {
    return (
      <EmptyState title="Minha produção é do aluno">
        Esta página mostra a produção da própria conta de aluno. A coordenação acompanha a turma em Coordenação → Visão da turma; o Admin, em Produção da turma.
      </EmptyState>
    )
  }
  const [{ options, spans, base }, allowed] = await Promise.all([loadProduction(auth.userId, area.cohort.id, area.modules), canRegister(area.cohort.id)])
  const { cohort, today } = area

  // ─── Filtro (no endereço) ─────────────────────────────────────────────────────────────────────
  const r = resolvePeriod(await searchParams, cohort, spans, today)
  const empty = base.records.length === 0

  const header = (
    <PageTitle eyebrow="Clínica" title="Minha produção" lead="Sua formação clínica, a partir dos seus registros. Só você vê esta página." />
  )

  if (empty) {
    return (
      <div data-producao="vazia">
        {header}
        <div className="glass rounded-[26px] p-6 sm:p-8">
          <p className="text-xl font-light">Sua produção aparece aqui conforme você registra seus casos.</p>
          <p className="mt-2 text-sm text-muted">Cada etapa registrada vira experiência clínica; a etapa final de um tratamento conta como tratamento concluído.</p>
          {allowed ? (
            <ButtonLink href="/casos/novo" className="mt-6">
              <IconPlus size={18} /> Registrar caso
            </ButtonLink>
          ) : null}
        </div>
      </div>
    )
  }

  const explore = exploreAreas(base, options)
  const exploreIds = [...explore.categories.flatMap((c) => c.procedures.map((p) => p.procedureId)), ...explore.procedures.map((p) => p.procedureId)]
  const library = await libraryForProcedures(exploreIds, auth.userId, cohort.id)

  return (
    <div data-producao>
      {header}

      {/* Filtros: poucos, no topo */}
      <PeriodFilters r={r} path="/producao" defaultFrom={cohort.startsOn} today={today} />

      <ProductionReport viewer="aluno" base={base} r={r} options={options} spans={spans} cohort={cohort} today={today} library={library} />
    </div>
  )
}
