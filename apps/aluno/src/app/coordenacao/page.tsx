import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CohortPanelPage } from '@/components/cohort/CohortPanelPage'
import { requireUser } from '@/lib/auth/session'
import { workflowsReady } from '@/lib/workflows/schema'

export const metadata: Metadata = { title: 'Visão da turma' }

/** Etapa 10 — Coordenação → Visão da turma (só as turmas que a pessoa coordena). */
export default async function CoordinationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await requireUser(['coordenacao', 'admin'])
  if (!auth) notFound()
  const workflows = await workflowsReady()
  const more: Array<[string, string]> = [
    ['/coordenacao/casos', 'Casos da turma'],
    ['/coordenacao/biblioteca', 'Progresso na biblioteca'],
    ['/coordenacao/avisos', 'Avisos'],
    ...(workflows ? ([['/coordenacao/workflows', 'Workflows clínicos']] as Array<[string, string]>) : []),
  ]
  return (
    <>
      <CohortPanelPage auth={auth} path="/coordenacao" eyebrow="Coordenação" title="Visão da turma" sp={await searchParams} />
      {/* Atalhos (no celular o cabeçalho não mostra a navegação da coordenação) */}
      <nav aria-label="Também na coordenação" className="mt-16 border-t border-rule pt-6" data-atalhos-coordenacao>
        <p className="eyebrow text-[10px]">Também na coordenação</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {more.map(([href, label]) => (
            <li key={href}>
              <Link
                href={href}
                className="glass inline-flex min-h-10 items-center rounded-full px-4 text-sm text-muted hover:text-ink"
                data-cartao-workflows={href === '/coordenacao/workflows' ? '' : undefined}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
