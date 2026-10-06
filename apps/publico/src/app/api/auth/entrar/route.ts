import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { log } from '@/lib/log'
import { devLoginEmail } from '@/server/auth'
import { resolveRole } from '@/server/auth/directory'
import { authorizationUrl, oauthConfigured } from '@/server/auth/google-oauth'
import { cookieOptions, redirectUri, SESSION_COOKIE, sessionCookieOptions, STATE_COOKIE, toLogin } from '@/server/auth/routes'
import { createSessionToken } from '@/server/auth/session'
import { createSheetWriter } from '@/server/data/source'

export const dynamic = 'force-dynamic'

/** Início do login: redireciona para o Google (ou, fora de produção, login de teste). */
export async function GET(request: Request) {
  const devEmail = devLoginEmail()
  if (devEmail) {
    const role = (await resolveRole(createSheetWriter(), devEmail)) ?? 'coordenacao'
    const response = NextResponse.redirect(new URL('/coordenacao', request.url))
    response.cookies.set(SESSION_COOKIE, createSessionToken(devEmail, role), sessionCookieOptions())
    log.info('auth.dev_login')
    return response
  }
  if (!oauthConfigured()) return NextResponse.redirect(toLogin(request, 'nao-configurado'))

  const state = randomBytes(24).toString('base64url')
  const response = NextResponse.redirect(authorizationUrl(redirectUri(request), state))
  response.cookies.set(STATE_COOKIE, state, cookieOptions(600))
  return response
}
