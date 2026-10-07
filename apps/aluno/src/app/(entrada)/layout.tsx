import { Logo } from '@/components/shell/Logo'

/** Telas de entrada (login, senha, 2FA, termo): sem navegação, só a marca e o painel. */
export default function EntryLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="conteudo" className="flex min-h-dvh flex-col justify-center px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-[600px]">
        <div className="mb-9 flex justify-center">
          <Logo href="/" />
        </div>
        {children}
        <p className="mt-8 text-center text-xs text-faint">Especialização Conexo · Portal do Aluno</p>
      </div>
    </main>
  )
}
