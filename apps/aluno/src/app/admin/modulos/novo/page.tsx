import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { Input, Select } from '@/components/admin/academic/ui'
import { createModule } from '@/lib/admin/academic-actions'
import { listCohorts } from '@/lib/admin/academic'

export const metadata: Metadata = { title: 'Novo módulo' }

/** Cria o módulo como rascunho e abre o editor (datas, programação e o resto entram lá). */
export default async function NewModulePage({ searchParams }: { searchParams: Promise<{ turma?: string }> }) {
  const { turma } = await searchParams
  const cohorts = await listCohorts()
  const current = cohorts.find((c) => c.id === turma) ?? cohorts.find((c) => c.status === 'ativa') ?? cohorts[0]
  return (
    <div className="max-w-2xl">
      <Link href={`/admin/modulos${current ? `?turma=${current.id}` : ''}`} className="text-sm text-muted hover:text-ink">
        ← Módulos e cronograma
      </Link>
      <PageTitle eyebrow="Especialização" title="Novo módulo" lead="Começa como rascunho, invisível para os alunos. Datas, programação, professores e materiais você completa no editor." />
      {cohorts.length ? (
        <section className="rounded-[22px] border border-rule bg-surface p-6">
          <ActionForm action={createModule} submit="Criar e abrir o editor" variant="primary">
            <Select label="Turma" name="turma" defaultValue={current?.id} options={cohorts.map((c) => [c.id, c.name])} />
            <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
              <Input label="Número" name="numero" type="number" min={1} />
              <Input label="Título" name="titulo" placeholder="Módulo 31" />
            </div>
          </ActionForm>
        </section>
      ) : (
        <p className="text-sm text-muted">Crie uma turma antes.</p>
      )}
    </div>
  )
}
