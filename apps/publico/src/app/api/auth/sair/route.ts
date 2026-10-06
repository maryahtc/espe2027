import { NextResponse } from 'next/server'
import { SESSION_COOKIE, toLogin } from '@/server/auth/routes'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const response = NextResponse.redirect(toLogin(request), 303)
  response.cookies.delete(SESSION_COOKIE)
  return response
}
