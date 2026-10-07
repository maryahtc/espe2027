import { refreshSession } from '@portal/db/proxy'
import { type NextRequest, NextResponse } from 'next/server'

/** Telas abertas a quem ainda não entrou. Todo o resto exige sessão. */
const PUBLIC_PATHS = ['/entrar', '/esqueci-senha', '/auth/confirmar', '/auth/retorno', '/api/saude', '/design']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Renova a sessão (cookies) e manda para /entrar quem não está logado.
 * É só a primeira barreira: papéis, 2FA e termo são conferidos no servidor de cada área, e a RLS no banco
 * é a garantia final.
 */
export async function proxy(request: NextRequest) {
  const { response, userId, configured } = await refreshSession(request)
  // Sem Supabase configurado (desenvolvimento): portal em modo prévia, só com dados fictícios.
  if (!configured || userId || isPublic(request.nextUrl.pathname)) return response

  const url = request.nextUrl.clone()
  url.pathname = '/entrar'
  url.search = ''
  const next = request.nextUrl.pathname + request.nextUrl.search
  if (next !== '/') url.searchParams.set('next', next)
  const redirect = NextResponse.redirect(url)
  // Mantém a limpeza/renovação de cookies feita pelo refreshSession.
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
  return redirect
}

export const config = {
  // Fora: arquivos estáticos, imagens otimizadas e ícones.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
}
