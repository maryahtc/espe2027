/**
 * Login com Google (OAuth 2.0, fluxo de código no servidor).
 * O portal só recebe o e-mail verificado da pessoa — nenhuma permissão sobre a conta dela.
 */
import 'server-only'
import { OAuth2Client } from 'google-auth-library'

export function oauthConfigured(): boolean {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET)
}

function client(redirectUri: string) {
  return new OAuth2Client({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri,
  })
}

export function authorizationUrl(redirectUri: string, state: string): string {
  return client(redirectUri).generateAuthUrl({
    scope: ['openid', 'email'],
    state,
    prompt: 'select_account',
    access_type: 'online',
  })
}

/** Troca o código pelo e-mail verificado da conta Google. */
export async function verifiedEmail(redirectUri: string, code: string): Promise<string | null> {
  const oauth = client(redirectUri)
  const { tokens } = await oauth.getToken(code)
  if (!tokens.id_token) return null
  const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_OAUTH_CLIENT_ID })
  const payload = ticket.getPayload()
  return payload?.email && payload.email_verified ? payload.email : null
}
