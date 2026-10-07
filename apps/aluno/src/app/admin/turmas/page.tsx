import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { Input, Select, TextArea } from '@/components/admin/academic/ui'
import { createCohort } from '@/lib/admin/academic-actions'
import { listCohorts } from '@/lib/admin/academic'
import { formatRange } from '@/lib/dates'

export const metadata: Metadata = { title: 'Turmas' }

export default async function AdminCohortsPage() {
  const cohorts = await listCohorts()
  return (
    <>
      <PageTitle
        eyebrow="Turmas e pessoas"
        title="Turmas"
        lead="Cada turma tem o próprio cronograma e os próprios módulos. Encerrar não apaga nada: os alunos continuam com acesso ao histórico."
      />
      <div className="flex flex-col-reverse gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="glass overflow-hidden rounded-2xl">
          <div className="hidden grid-cols-[1fr_12rem_8rem_7rem] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold text-muted md:grid">
            <span>Turma</span>
            <span>Período</span>
            <span>Módulos</span>
            <span>Situação</span>
          </div>
          <ul className="divide-y divide-rule">
            {cohorts.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/turmas/${c.id}`} className="grid gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-white/[0.04] md:grid-cols-[1fr_12rem_8rem_7rem] md:items-center">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{c.name}</span>
                    <span className="block text-xs text-muted">
                      <span className="num">{c.students}</span> {c.students === 1 ? 'aluno' : 'alunos'}
                    </span>
                  </span>
                  <span className="num text-sm text-ink-2">{formatRange(c.startsOn, c.endsOn)}</span>
                  <span className="text-sm text-muted">
                    <span className="num text-ink">{c.modules}</span> ({c.published} publicados)
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                    <span className={c.status === 'ativa' ? 'size-2 rounded-full bg-ink' : 'size-2 rounded-full border border-faint'} />
                    {c.status === 'ativa' ? 'Ativa' : 'Encerrada'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <section className="rounded-[22px] border border-rule bg-surface p-6">
          <h2 className="eyebrow">Nova turma</h2>
          <div className="mt-5">
            <ActionForm action={createCohort} submit="Criar turma" variant="primary">
              <Input label="Nome" name="nome" required placeholder="Especialização Conexo | Turma 2028" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <Input label="Início" name="inicio" type="date" required />
                <Input label="Previsão de conclusão" name="fim" type="date" required />
              </div>
              <TextArea label="Descrição (opcional)" name="descricao" rows={2} />
              <Select
                label="Começar com os módulos de outra turma"
                name="copiar_de"
                defaultValue=""
                options={[['', 'Não, turma vazia'], ...cohorts.map((c) => [c.id, `Copiar de ${c.name}`] as [string, string])]}
              />
              <p className="text-xs text-muted">A cópia traz módulos, dias, programação, equipe e materiais como rascunho, com as datas deslocadas pelo novo início.</p>
            </ActionForm>
          </div>
        </section>
      </div>
    </>
  )
}
