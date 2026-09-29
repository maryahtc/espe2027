/**
 * Sessão da área de edição: cookie httpOnly com conteúdo assinado (HMAC-SHA256).
 * Não guarda nada além do e-mail, do perfil e da validade.
 */
import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { EditorRole } from '@/config/editing'
import { isProductionDeployment } from '@/server/data/source'

export const SESSION_COOKIE = 'portal_sessao'
export const SESSION_HOURS = 12

export type Session = { email: string; role: EditorRole; exp: number }

const devSecret = globalThis as unknown as { __portalDevSecret?: string }

function secret(): string {
  const value = process.env.SESSION_SECRET
  if (value && value.length >= 32) return value
  if (isProductionDeployment() || process.env.NODE_ENV === 'production' && process.env.DATA_SOURCE === 'sheets') {
    throw new Error('SESSION_SECRET ausente ou curto (mínimo 32 caracteres).')
  }
  return (devSecret.__portalDevSecret ??= randomBytes(32).toString('hex'))
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function createSessionToken(email: string, role: EditorRole, now = Date.now()): string {
  const session: Session = { email, role, exp: now + SESSION_HOURS * 3600_000 }
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function readSessionToken(token: string | undefined, now = Date.now()): Session | null {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Session
    if (typeof session.email !== 'string' || session.exp < now) return null
    if (session.role !== 'coordenacao' && session.role !== 'professor') return null
    return session
  } catch {
    return null
  }
}
