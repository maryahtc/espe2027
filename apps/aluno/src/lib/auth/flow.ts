/** Regras puras da entrada (sem acesso a rede): quem precisa de 2FA, para onde ir depois de cada passo. */

export type Role = 'admin' | 'coordenacao' | 'aluno'

export type AuthState = {
  userId: string
  email: string
  role: Role
  fullName: string
  displayName: string | null
  /** aal2 = sessão confirmada com o código do aplicativo autenticador. */
  aal: 'aal1' | 'aal2'
  hasVerifiedFactor: boolean
  needsTerms: boolean
}

/** 2FA obrigatório para admin e coordenação; para o aluno, só se ele mesmo ativou. */
export function needsMfa(auth: AuthState): boolean {
  if (auth.aal === 'aal2') return false
  return auth.role !== 'aluno' || auth.hasVerifiedFactor
}

export function homeFor(role: Role): string {
  return role === 'admin' ? '/admin' : role === 'coordenacao' ? '/coordenacao' : '/'
}

/** Só caminhos internos (evita redirecionar para outro site depois do login). */
export function safeNext(next: unknown): string | null {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  return next
}

function withNext(path: string, next: string | null) {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path
}

/** Próxima tela depois de cada passo da entrada: 2FA → termo → destino (ou início do papel). */
export function nextStep(auth: AuthState, next?: unknown): string {
  const target = safeNext(next)
  if (needsMfa(auth)) return withNext(auth.hasVerifiedFactor ? '/seguranca/2fa' : '/seguranca/2fa/configurar', target)
  if (auth.needsTerms) return withNext('/termo', target)
  return target ?? homeFor(auth.role)
}

