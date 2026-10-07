import { ButtonLink } from '@portal/ui/button'
import { IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import { StatusPill } from '@portal/ui/tag'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { LifecycleTabs } from '@/components/admin/Lifecycle'
import { moveModule } from '@/lib/admin/academic-actions'
import { adminModules, listCohorts } from '@/lib/admin/academic'
import { inDefinition } from '@/lib/academic/model'
import { formatDayMonth, year } from '@/lib/dates'

export const metadata: Metadata = { title: 'Módulos e cronograma' }

export default async function AdminModulesPage({ searchParams }: { searchParams: Promise<{ turma?: string }> }) {
  const { turma } = await searchParams
  const cohorts = await listCohorts()
  const cohort = cohorts.find((c) => c.id === turma) ?? cohorts.find((c) => c.status === 'ativa') ?? cohorts[0]
  const modules = cohort ? await adminModules(cohort.id) : []
  const counts = {
    rascunho: modules.filter((m) => m.status === 'rascunho').length,
    publicado: modules.filter((m) => m.status === 'publicado').length,
    arquivado: modules.filter((m) => m.status === 'arquivado').length,
  }
  // A sequência do painel deveria acompanhar as datas; avisa quando não acompanha.
  const dated = modules.filter((m) => m.status !== 'arquivado' && m.start)
  const outOfOrder = dated.some((m, i) => i > 0 && m.start! < dated[i - 1]!.start!)

  return (
    <div data-lc-root="modulos">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageTitle
          eyebrow={`Especialização${cohort ? ` · ${cohort.name}` : ''}`}
          title="Módulos e cronograma"
          lead="Rascunhos ficam invisíveis para os alunos. Publicados continuam editáveis e as mudanças valem na hora. Nada é apagado: o que sai de cena é arquivado."
        />
        {cohort ? (
          <ButtonLink href={`/admin/modulos/novo?turma=${cohort.id}`} className="mb-8 md:mb-10">
            <IconPlus size={18} /> Novo módulo
          </ButtonLink>
        ) : null}
      </div>

      {cohorts.length > 1 ? (
        <nav aria-label="Turma" className="mb-6 flex flex-wrap gap-2">
          {cohorts.map((c) => (
            <Link
              key={c.id}
              href={`/admin/modulos?turma=${c.id}`}
              aria-current={c.id === cohort?.id ? 'page' : undefined}
              className={c.id === cohort?.id ? 'rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-on-ink' : 'glass rounded-full px-3.5 py-1.5 text-sm text-muted hover:text-ink'}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {!cohort ? (
        <p className="text-sm text-muted">
          Nenhuma turma cadastrada.{' '}
          <Link href="/admin/turmas" className="underline">
            Criar turma
          </Link>
        </p>
      ) : (
        <>
          <LifecycleTabs name="modulos" counts={counts} />
          {outOfOrder ? (
            <p className="mb-4 rounded-md bg-danger-bg px-4 py-3 text-sm text-danger">
              ⚠ A ordem dos módulos não acompanha as datas. Use ↑ ↓ para reorganizar a sequência.
            </p>
          ) : null}
          <div className="glass overflow-hidden rounded-2xl">
            <div className="hidden grid-cols-[4rem_1fr_8rem_11rem_8rem_4.5rem] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold text-muted md:grid">
              <span>Nº</span>
              <span>Módulo</span>
              <span>Início</span>
              <span>Conteúdo</span>
              <span>Estado</span>
              <span>Ordem</span>
            </div>
            <ul className="divide-y divide-rule">
              {modules.map((m, i) => (
                <li key={m.id} data-lifecycle={m.status} className="grid grid-cols-[1fr_auto] items-center md:grid-cols-[1fr_4.5rem]">
                  <Link
                    href={`/admin/modulos/${m.id}`}
                    className="grid grid-cols-[3rem_1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-white/[0.04] md:grid-cols-[4rem_1fr_8rem_11rem_8rem]"
                  >
                    <span className={`num text-xl font-light ${m.status === 'arquivado' ? 'text-faint' : ''}`}>{m.label}</span>
                    <span className={`truncate text-[15px] font-semibold ${m.status === 'arquivado' ? 'text-muted' : ''}`}>{m.title}</span>
                    <span className="num hidden text-sm text-ink-2 md:block">{m.start ? `${formatDayMonth(m.start)}/${String(year(m.start)).slice(2)}` : '—'}</span>
                    <span className="hidden truncate text-sm text-muted md:block">
                      {m.days.length ? `${m.days.length} dias · ${m.days.flatMap((d) => d.sessions).length} atividades` : 'Sem datas'}
                      {inDefinition(m) && m.days.length ? ' · em definição' : ''}
                    </span>
                    <span className="text-right md:text-left">
                      <StatusPill status={m.status} />
                    </span>
                  </Link>
                  <span className="flex items-center gap-1 pr-4">
                    <ActionForm action={moveModule} quiet silent submit="↑">
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="direcao" value="acima" />
                    </ActionForm>
                    <ActionForm action={moveModule} quiet silent submit="↓">
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="direcao" value="abaixo" />
                    </ActionForm>
                    <span className="sr-only">Posição {i + 1}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
