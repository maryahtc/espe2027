import Link from 'next/link'

/** Topo das páginas do workflow: volta ao caso (quando veio do Planejamento) e/ou à lista/visão geral. */
export function WorkflowBack({ caseId, href, label }: { caseId: string | null; href: string; label: string }) {
  return (
    <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {caseId ? (
        <Link href={`/casos/${caseId}#planejamento`} className="inline-flex min-h-11 items-center font-semibold text-ink underline-offset-4 hover:underline" data-voltar-caso>
          ← Voltar ao caso
        </Link>
      ) : null}
      <Link href={href} className="inline-flex min-h-11 items-center text-muted hover:text-ink">
        {caseId ? label.replace(/^← /, '') : label}
      </Link>
    </p>
  )
}

export const NOTICE = 'Referência de consulta rápida. Não substitui o julgamento clínico nem o planejamento do caso.'
