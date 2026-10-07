import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PreviewFrame } from '@/components/admin/PreviewFrame'
import { ModuleView } from '@/components/modules/ModuleView'
import { today } from '@/lib/academic/load'
import { loadAdminModule } from '@/lib/admin/academic'

export const metadata: Metadata = { title: 'Pré-visualizar módulo' }

/** O mesmo componente da tela do aluno, mostrando também o que ainda está em rascunho (sinalizado). */
export default async function ModulePreview({ params }: { params: Promise<{ id: string }> }) {
  const page = await loadAdminModule((await params).id)
  if (!page) notFound()
  const m = page.detail.module
  const label =
    m.status === 'publicado' ? 'publicado: é assim que os alunos veem' : m.status === 'rascunho' ? 'rascunho, ainda invisível para os alunos' : 'arquivado, fora da vista dos alunos'
  return (
    <PreviewFrame backHref={`/admin/modulos/${m.id}`} label={`Módulo ${m.label} · ${label}`}>
      <ModuleView detail={page.detail} siblings={page.siblings.filter((s) => s.status !== 'arquivado')} today={today()} preview />
    </PreviewFrame>
  )
}
