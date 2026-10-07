import type { CookieOptionsWithName } from '@supabase/ssr'

/**
 * Cookies da sessão: inacessíveis ao JavaScript da página (httpOnly), só por HTTPS em produção e
 * enviados apenas em navegação do próprio site (SameSite=Lax). Todo o login acontece no servidor,
 * por isso o navegador nunca precisa ler a sessão.
 */
export const sessionCookieOptions: CookieOptionsWithName = {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
}
