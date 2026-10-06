import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6">
      <p className="num text-6xl font-light text-signal">404</p>
      <h1 className="mt-4 text-2xl font-light">Esta página não existe.</h1>
      <Link href="/" className="mt-6 text-sm font-semibold underline">
        Voltar para o início
      </Link>
    </main>
  )
}
