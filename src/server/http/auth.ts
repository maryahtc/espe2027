import 'server-only'
import { timingSafeEqual } from 'node:crypto'

/** Verifica "Authorization: Bearer <REVALIDATE_SECRET>" em tempo constante. */
export function isAuthorized(request: Request): boolean {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret || secret.length < 16) return false
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const noStoreHeaders = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
