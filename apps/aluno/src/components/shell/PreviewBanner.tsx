import Link from 'next/link'

/** Faixa da prévia: avisa que os dados das telas ainda são fictícios e liga as três áreas para navegação. */
export function PreviewBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-rule bg-black/60 px-4 py-1.5 text-[11px] font-medium tracking-wide text-muted">
      <span>
        <span className="font-semibold text-ink">Prévia</span> · dados fictícios
      </span>
      <span className="flex gap-3">
        <Link href="/" className="underline-offset-2 hover:text-ink hover:underline">
          Aluno
        </Link>
        <Link href="/admin" className="underline-offset-2 hover:text-ink hover:underline">
          Admin
        </Link>
        <Link href="/design" className="underline-offset-2 hover:text-ink hover:underline">
          Design system
        </Link>
      </span>
    </div>
  )
}
