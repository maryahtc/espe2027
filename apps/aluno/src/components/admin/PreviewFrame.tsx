import Link from 'next/link'

/** Moldura da pré-visualização: mostra a tela exatamente como o aluno verá, com uma faixa de contexto. */
export function PreviewFrame({ backHref, label, children }: { backHref: string; label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="glass-strong sticky top-0 z-40 mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm lg:top-4">
        <span className="flex items-center gap-2.5">
          <span className="glow-dot !size-1.5" />
          <strong className="font-semibold">Pré-visualização como aluno</strong>
          <span className="text-muted">· {label}</span>
        </span>
        <Link href={backHref} className="font-semibold underline underline-offset-2">
          Voltar ao editor
        </Link>
      </div>
      {children}
    </>
  )
}
