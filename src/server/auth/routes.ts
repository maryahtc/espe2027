import 'server-only'
import { SESSION_COOKIE, SESSION_HOURS } from './session'

export const STATE_COOKIE = 'portal_oauth_estado'

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  }
}

export const sessionCookieOptions = () => cookieOptions(SESSION_HOURS * 3600)
export { SESSION_COOKIE }

/** Endereço de retorno do Google. Deve estar cadastrado no Google Cloud. */
export function redirectUri(request: Request): string {
  const base = process.env.PORTAL_BASE_URL?.replace(/\/$/, '') || new URL(request.url).origin
  return `${base}/api/auth/retorno`
}

export function toLogin(request: Request, erro?: string): URL {
  const url = new URL('/coordenacao/entrar', request.url)
  if (erro) url.searchParams.set('erro', erro)
  return url
}
