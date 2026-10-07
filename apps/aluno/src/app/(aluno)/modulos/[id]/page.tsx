import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ModuleView } from '@/components/modules/ModuleView'
import { cohortModules, loadModuleDetail, today } from '@/lib/academic/load'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const detail = await loadModuleDetail((await params).id)
  return { title: detail ? `Módulo ${detail.module.label} · ${detail.module.title}` : 'Módulo' }
}

/** Página do módulo para o aluno: só publicados da própria turma (RLS); rascunhos dão 404. */
export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const detail = await loadModuleDetail((await params).id)
  if (!detail || detail.module.status !== 'publicado') notFound()
  const siblings = await cohortModules(detail.module.cohortId)
  const own = siblings.find((s) => s.id === detail.module.id)
  if (own) detail.module.state = own.state
  // Na área do aluno, recursos ainda não liberados ficam de fora até para admin e coordenação.
  detail.resources = detail.resources.filter(
    (r) => r.status === 'publicado' && (!r.availableFrom || new Date(r.availableFrom) <= new Date()),
  )
  detail.module.staff = detail.module.staff.filter((s) => s.visible)
  return <ModuleView detail={detail} siblings={siblings} today={today()} />
}
