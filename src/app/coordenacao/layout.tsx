import type { Metadata } from 'next'
import { currentEditor } from '@/server/auth'

export const metadata: Metadata = {
  title: { default: 'Área de edição', template: '%s · Área de edição' },
  robots: { index: false, follow: false },
}

export default async function EditingLayout({ children }: { children: React.ReactNode }) {
  const editor = await currentEditor()
  return (
    <div className="pb-10">
      <div className="-mx-4 mb-2 flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-surface px-4 py-2 text-sm md:-mx-8 md:px-8">
        <span className="label !text-ink">Área de edição</span>
        {editor ? (
          <form action="/api/auth/sair" method="post" className="flex items-center gap-3">
            <span className="text-muted">
              {editor.email} · {editor.role === 'coordenacao' ? 'Coordenação' : 'Professor'}
            </span>
            <button type="submit" className="link-underline min-h-9">
              Sair
            </button>
          </form>
        ) : null}
      </div>
      {children}
    </div>
  )
}
