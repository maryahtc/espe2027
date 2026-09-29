import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { errorMessage, log } from '@/lib/log'
import { resolveRole } from '@/server/auth/directory'
import { verifiedEmail } from '@/server/auth/google-oauth'
import { redirectUri, SESSION_COOKIE, sessionCookieOptions, STATE_COOKIE, toLogin } from '@/server/auth/routes'
import { createSessionToken } from '@/server/auth/session'
import { createSheetWriter } from '@/server/data/source'

export const dynamic = 'force-dynamic'

function sameState(a: string | undefined, b: string | null): boolean {
  if (!a || !b) return false
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

/** Retorno do Google: confere o estado, o e-mail verificado e a autorização. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const cookieState = request.headers
    .get('cookie')
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1)
  const code = url.searchParams.get('code')
  if (!code || !sameState(cookieState, url.searchParams.get('state'))) {
    return NextResponse.redirect(toLogin(request, 'sessao-expirada'))
  }

  try {
    const email = await verifiedEmail(redirectUri(request), code)
    if (!email) return NextResponse.redirect(toLogin(request, 'email-nao-verificado'))
    const role = await resolveRole(createSheetWriter(), email)
    if (!role) {
      log.warn('auth.denied')
      return NextResponse.redirect(toLogin(request, 'nao-autorizado'))
    }
    const response = NextResponse.redirect(new URL('/coordenacao', request.url))
    response.cookies.set(SESSION_COOKIE, createSessionToken(email, role), sessionCookieOptions())
    response.cookies.delete(STATE_COOKIE)
    log.info('auth.login', { role })
    return response
  } catch (error) {
    log.error('auth.failed', { message: errorMessage(error) })
    return NextResponse.redirect(toLogin(request, 'falha'))
  }
}
