import { ArrowLink } from '@/components/ui/ArrowLink'

export default function NotFound() {
  return (
    <div className="py-20 md:py-32">
      <p className="label">Página não encontrada</p>
      <h1 className="mt-3 font-display text-5xl leading-tight md:text-6xl">Não encontramos esta página.</h1>
      <p className="mt-3 max-w-md text-muted">O endereço pode ter mudado, ou o conteúdo ainda não foi publicado.</p>
      <div className="mt-8 flex flex-wrap gap-6">
        <ArrowLink href="/">Ir para o início</ArrowLink>
        <ArrowLink href="/busca">Buscar no portal</ArrowLink>
      </div>
    </div>
  )
}
