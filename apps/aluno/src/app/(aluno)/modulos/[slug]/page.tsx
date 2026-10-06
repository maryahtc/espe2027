import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ModuleView } from '@/components/modules/ModuleView'
import { moduleBySlug, modules } from '@/demo/data'

export function generateStaticParams() {
  return modules.map((m) => ({ slug: m.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const m = moduleBySlug((await params).slug)
  return { title: m ? `Módulo ${m.slug} · ${m.title}` : 'Módulo' }
}

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const m = moduleBySlug((await params).slug)
  if (!m) notFound()
  return <ModuleView m={m} />
}
