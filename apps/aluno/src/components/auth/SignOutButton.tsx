import { Button } from '@portal/ui/button'
import { signOut } from '@/lib/auth/actions'

/** Sair: encerra a sessão neste aparelho e volta para a tela de entrada. */
export function SignOutButton({ className, label = 'Sair', quiet = false }: { className?: string; label?: string; quiet?: boolean }) {
  return (
    <form action={signOut} className={className}>
      <Button type="submit" variant={quiet ? 'quiet' : 'secondary'} className={quiet ? 'text-muted hover:text-ink' : 'w-full'}>
        {label}
      </Button>
    </form>
  )
}
