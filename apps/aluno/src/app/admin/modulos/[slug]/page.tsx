import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ModuleEditor } from '@/components/admin/ModuleEditor'
import { moduleBySlug, modules } from '@/demo/data'

export function generateStaticParams() {
  return modules.map((m) => ({ slug: m.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const m = moduleBySlug((await params).slug)
  return { title: m ? `Editar módulo ${m.slug}` : 'Módulo' }
}

export default async function EditModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const m = moduleBySlug((await params).slug)
  if (!m) notFound()
  // Publicado: a pré-visualização é a própria página do aluno.
  return <ModuleEditor m={m} status="publicado" previewHref={`/modulos/${m.slug}`} />
}
