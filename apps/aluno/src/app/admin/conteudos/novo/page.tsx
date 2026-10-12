import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ActionForm } from '@/components/admin/academic/ActionForm'
import { Input, Select } from '@/components/admin/academic/ui'
import { requireUser } from '@/lib/auth/session'
import { createContent } from '@/lib/admin/library-actions'
import { loadTaxonomy } from '@/lib/library/load'
import { KIND_LABEL, KINDS } from '@/lib/library/model'

export const metadata: Metadata = { title: 'Novo conteúdo' }

export default async function NewContentPage() {
  await requireUser(['admin'])
  const { categories } = await loadTaxonomy()
  return (
    <>
      <Link href="/admin/conteudos" className="text-sm text-muted hover:text-ink">
        ← Aulas e conteúdos
      </Link>
      <PageTitle eyebrow="Biblioteca" title="Nova aula ou conteúdo" lead="Começa como rascunho (invisível para os alunos). Depois de criar, você completa temas, professores, arquivo, módulos e publica." />
      <div className="max-w-2xl">
        <ActionForm action={createContent} submit="Criar rascunho" variant="primary">
          <Select label="Tipo" name="tipo" defaultValue="video" options={KINDS.map((k) => [k, KIND_LABEL[k]])} />
          <Input label="Título" name="titulo" required maxLength={200} />
          <Select label="Área" name="area" options={categories.map((c) => [c.id, c.name])} />
        </ActionForm>
      </div>
    </>
  )
}
