/** Regras puras da entrada (sem acesso a rede): para onde ir depois de cada passo. */

export type Role = 'admin' | 'coordenacao' | 'aluno'

export type AuthState = {
  userId: string
  email: string
  role: Role
  fullName: string
  displayName: string | null
  needsTerms: boolean
}

export function homeFor(role: Role): string {
  return role === 'admin' ? '/admin' : role === 'coordenacao' ? '/coordenacao' : '/'
}

/** Só caminhos internos (evita redirecionar para outro site depois do login). */
export function safeNext(next: unknown): string | null {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  return next
}

/** Próxima tela depois de entrar: termo de uso (se houver versão nova) → destino (ou início do papel). */
export function nextStep(auth: AuthState, next?: unknown): string {
  const target = safeNext(next)
  if (auth.needsTerms) return target ? `/termo?next=${encodeURIComponent(target)}` : '/termo'
  return target ?? homeFor(auth.role)
}
