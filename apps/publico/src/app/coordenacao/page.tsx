import Link from 'next/link'
import { PageHeader, SectionHeader } from '@/components/ui/PageHeader'
import { ArrowRight } from '@/components/ui/icons'
import { EDITABLE_ENTITIES } from '@/config/editing'
import { requireEditor } from '@/server/auth'
import { getPortalData } from '@/server/data/repository'
import { createSheetWriter } from '@/server/data/source'
import type { DataIssue } from '@/server/data/types'
import { listRecords, loadTable } from '@/server/editing/records'

export const metadata = { title: 'Painel' }
export const dynamic = 'force-dynamic'

const ISSUE_TEXT: Partial<Record<DataIssue['code'], string>> = {
  tab_missing: 'Aba não encontrada',
  column_missing: 'Coluna não encontrada',
  row_invalid: 'Linha ignorada: campo obrigatório vazio ou ilegível',
  field_invalid: 'Valor ilegível (ignorado)',
  duplicate_module: 'Número de módulo repetido',
  module_implicit: 'Módulo usado nas aulas, mas ausente na aba MÓDULOS',
  module_ambiguous: 'Aula de módulo com número repetido: não foi possível saber qual',
  professor_unregistered: 'Professor citado nas aulas, mas ausente na aba PROFESSORES',
  professor_alias_ambiguous: 'Apelido usado por mais de um professor',
  slug_collision: 'Dois professores com o mesmo nome',
  date_out_of_course: 'Data fora do período do curso',
  date_out_of_module: 'Data da aula fora das datas do módulo',
  date_range_inverted: 'Data fim anterior à data início',
  material_not_in_inventory: 'Material não encontrado no ESTOQUE',
}

export default async function EditingHome() {
  await requireEditor()
  const writer = createSheetWriter()
  const counts = await Promise.all(
    EDITABLE_ENTITIES.map(async (entity) => ({ entity, count: listRecords(entity, await loadTable(writer, entity)).length })),
  )
  const { report } = await getPortalData()
  const issues = report.issues.filter((i) => i.code !== 'column_missing' || i.severity === 'error')

  return (
    <>
      <PageHeader
        title="O que você quer atualizar?"
        description="Materiais, estoque e equipamentos: as alterações são gravadas na planilha e aparecem no portal na hora. Cronograma, módulos e professores são atualizados só no Admin do Portal do Aluno."
      />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {counts.map(({ entity, count }) => (
          <li key={entity.slug}>
            <Link
              href={`/coordenacao/${entity.slug}`}
              className="group flex min-h-20 items-center justify-between gap-3 rounded-lg border border-rule bg-surface p-4 hover:border-rule-strong"
            >
              <span>
                <span className="block text-[17px] font-semibold">{entity.label}</span>
                <span className="data text-xs text-muted">
                  {count} {count === 1 ? 'registro' : 'registros'}
                </span>
              </span>
              <ArrowRight className="text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-14">
        <SectionHeader title="Pontos a confirmar na planilha" count={issues.length} />
        {issues.length ? (
          <ul className="divide-y divide-rule border-b border-rule text-sm">
            {issues.map((issue, i) => (
              <li key={i} className="flex flex-wrap gap-x-3 py-2.5">
                <span className="data w-44 shrink-0 text-muted">
                  {issue.tab}
                  {issue.row ? ` · linha ${issue.row}` : ''}
                </span>
                <span>
                  {ISSUE_TEXT[issue.code] ?? issue.code}
                  {issue.field ? <span className="text-muted"> ({issue.field})</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Nenhuma inconsistência encontrada.</p>
        )}
      </section>
    </>
  )
}
