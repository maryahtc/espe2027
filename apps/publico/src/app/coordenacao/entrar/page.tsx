import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { currentEditor, devLoginEmail } from '@/server/auth'
import { oauthConfigured } from '@/server/auth/google-oauth'

export const metadata = { title: 'Entrar' }

const ERRORS: Record<string, string> = {
  'nao-autorizado':
    'Este e-mail não está autorizado. Professores precisam ter o e-mail cadastrado na coluna “E-mail” da aba PROFESSORES; fale com a coordenação.',
  'email-nao-verificado': 'O Google não confirmou este e-mail. Tente com outra conta.',
  'sessao-expirada': 'O login demorou demais ou foi interrompido. Tente de novo.',
  'nao-configurado': 'O login com Google ainda não foi configurado neste ambiente.',
  falha: 'Não foi possível concluir o login agora. Tente de novo em instantes.',
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await currentEditor()) redirect('/coordenacao')
  const { erro } = await searchParams
  const dev = devLoginEmail()
  return (
    <div className="max-w-xl">
      <PageHeader
        title="Entrar para editar"
        description="Professores e coordenação podem atualizar o cronograma, os materiais e o estoque. Tudo o que for salvo aqui é gravado diretamente na planilha oficial."
      />
      {erro && ERRORS[erro] ? (
        <div role="alert" className="mb-6 rounded-md border border-danger/40 bg-danger-bg px-4 py-3 text-sm text-danger">
          {ERRORS[erro]}
        </div>
      ) : null}
      {/* Link (não formulário): o redirecionamento para o Google é uma navegação comum. */}
      <a
        href="/api/auth/entrar"
        className="inline-flex min-h-12 items-center gap-3 rounded-md bg-ink px-6 text-[15px] font-semibold text-paper hover:bg-ink-2"
      >
        {dev ? `Entrar como ${dev} (teste)` : 'Entrar com Google'}
      </a>
      {dev ? (
        <p className="mt-4 text-sm text-muted">
          Ambiente de teste: o login com Google está desligado e as alterações ficam só na memória do servidor, sem tocar a planilha real.
        </p>
      ) : !oauthConfigured() ? (
        <p className="mt-4 text-sm text-muted">Login indisponível: faltam as credenciais do Google neste ambiente.</p>
      ) : null}
    </div>
  )
}
