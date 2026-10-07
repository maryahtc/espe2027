import { createSupabaseServerClient } from '@portal/db/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthCard } from '@/components/auth/AuthCard'
import { EnrollMfaForm, FormMessage } from '@/components/auth/forms'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { nextStep, requireSignedIn, safeNext } from '@/lib/auth/session'

export const metadata: Metadata = { title: 'Ativar verificação em duas etapas' }
export const dynamic = 'force-dynamic'

function Step({ n, title, children }: { n: string; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="num w-6 shrink-0 pt-0.5 text-sm font-semibold text-signal">{n}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold">{title}</p>
        {children ? <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div> : null}
      </div>
    </li>
  )
}

export default async function EnrollMfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const auth = await requireSignedIn()
  const target = safeNext(next)
  if (auth.hasVerifiedFactor) {
    redirect(auth.aal === 'aal2' ? nextStep(auth, target) : `/seguranca/2fa${target ? `?next=${encodeURIComponent(target)}` : ''}`)
  }

  // Um cadastro novo a cada abertura: descarta tentativas anteriores não confirmadas.
  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect('/entrar')
  const { data: factors } = await supabase.auth.mfa.listFactors()
  for (const f of factors?.all ?? []) {
    if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id })
  }
  const { data: enrolled, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `Portal Conexo ${new Date().toISOString().slice(0, 10)}`,
    issuer: 'Portal Conexo',
  })

  const required = auth.role !== 'aluno'
  return (
    <AuthCard
      eyebrow="Verificação em duas etapas"
      title={required ? 'Ative a verificação em duas etapas' : 'Proteja sua conta'}
      lead={
        required
          ? 'Obrigatória para administração e coordenação, porque o seu acesso alcança os dados da turma. A partir de agora, o portal pede um código do celular a cada entrada.'
          : 'Opcional para alunos. Depois de ativar, o portal pede um código do celular a cada entrada.'
      }
    >
      {error || !enrolled ? (
        <FormMessage state={{ erro: 'Não foi possível iniciar a ativação. Recarregue a página.' }} />
      ) : (
        <ol className="space-y-7">
          <Step n="01" title="Instale um aplicativo autenticador">
            Google Authenticator, Microsoft Authenticator ou o gerenciador de senhas que você já usa.
          </Step>
          <Step n="02" title="Leia o QR code com o aplicativo">
            {/* eslint-disable-next-line @next/next/no-img-element -- QR gerado pelo Supabase como data URL */}
            <img src={enrolled.totp.qr_code} alt="QR code para o aplicativo autenticador" width={176} height={176} className="rounded-md bg-white p-2.5" />
            <p className="mt-3">Sem câmera? Digite esta chave no aplicativo:</p>
            <p className="num mt-1 rounded-md bg-sunken px-3 py-2 text-[13px] tracking-wider break-all text-ink select-all">
              {enrolled.totp.secret.replace(/(.{4})/g, '$1 ').trim()}
            </p>
          </Step>
          <Step n="03" title="Digite o código que aparece no aplicativo">
            <div className="mt-3 text-ink">
              <EnrollMfaForm factorId={enrolled.id} next={target ?? undefined} />
            </div>
          </Step>
        </ol>
      )}
      <div className="mt-7 border-t border-rule pt-5 text-center text-sm">
        {required ? (
          <SignOutButton quiet label="Sair" />
        ) : (
          <Link href="/perfil" className="text-muted underline-offset-4 hover:text-ink hover:underline">
            Agora não
          </Link>
        )}
      </div>
    </AuthCard>
  )
}
