import { createSupabaseServerClient } from '@portal/db/server'
import { Chip } from '@portal/ui/tag'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthCard } from '@/components/auth/AuthCard'
import { AcceptTermsForm } from '@/components/auth/forms'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { homeFor, needsMfa, nextStep, requireSignedIn, safeNext } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Termo de uso' }

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })

export default async function TermsPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const auth = await requireSignedIn()
  const target = safeNext(next)
  if (needsMfa(auth)) redirect(nextStep(auth, target ?? '/termo'))

  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect('/entrar')
  const { data: currentId } = await supabase.rpc('current_terms_version_id')
  const [{ data: version }, { data: acceptance }] = await Promise.all([
    supabase.from('terms_versions').select('id, version, body, is_provisional, effective_from').eq('id', currentId ?? '').maybeSingle(),
    supabase.from('terms_acceptances').select('accepted_at').eq('terms_version_id', currentId ?? '').maybeSingle(),
  ])

  if (!version) {
    if (auth.needsTerms) redirect('/entrar')
    redirect(homeFor(auth.role))
  }

  return (
    <AuthCard
      wide
      eyebrow="Termo de uso"
      title={auth.needsTerms ? 'Antes de começar' : 'Termo de uso'}
      lead={auth.needsTerms ? 'Leia o termo de uso do Portal do Aluno. O aceite é pedido no primeiro acesso e sempre que o termo mudar.' : undefined}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>
          Versão <span className="num text-ink">{version.version}</span>
        </span>
        {version.is_provisional ? <Chip>Texto provisório</Chip> : null}
      </div>
      <div className="max-h-[45dvh] overflow-y-auto rounded-md border border-rule bg-surface p-5 text-[15px] leading-relaxed whitespace-pre-line text-ink-2">
        {version.body}
      </div>
      <div className="mt-6">
        {auth.needsTerms ? (
          <>
            <AcceptTermsForm versionId={version.id} next={target ?? undefined} />
            <div className="mt-5 text-center text-sm">
              <SignOutButton quiet label="Sair" />
            </div>
          </>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-muted">
              Você aceitou esta versão em{' '}
              <span className="text-ink">{acceptance ? dateTime.format(new Date(acceptance.accepted_at)) : '—'}</span>.
            </p>
            <Link href={target ?? '/perfil'} className="font-semibold underline underline-offset-4">
              ← Voltar
            </Link>
          </div>
        )}
      </div>
    </AuthCard>
  )
}
