import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { deflateRawSync, inflateRawSync } from 'node:zlib'
import type { SimPayload } from './state'

/**
 * Lacre do rascunho da simulação: comprime e cifra (AES-256-GCM, que também detecta qualquer alteração).
 * A chave é derivada da chave secreta do Supabase que já existe no servidor — nada novo para cadastrar,
 * e ela nunca vai para o navegador. Sem a chave, a simulação fica indisponível.
 */
function key(): Buffer | null {
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) return null
  return createHash('sha256').update(`conexo-simulacao-aluno-v1|${secret}`).digest()
}

export const simulationAvailable = () => key() !== null

export function seal(payload: SimPayload): string {
  const k = key()
  if (!k) throw new Error('Simulação indisponível neste ambiente.')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', k, iv)
  const body = Buffer.concat([cipher.update(deflateRawSync(Buffer.from(JSON.stringify(payload)))), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url')
}

/** null = ausente, adulterado ou de outra chave. */
export function unseal(raw: string): SimPayload | null {
  const k = key()
  if (!k || !raw) return null
  try {
    const buf = Buffer.from(raw, 'base64url')
    const decipher = createDecipheriv('aes-256-gcm', k, buf.subarray(0, 12))
    decipher.setAuthTag(buf.subarray(12, 28))
    const json = inflateRawSync(Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()])).toString('utf8')
    const p = JSON.parse(json) as SimPayload
    return p && p.v === 1 && typeof p.admin === 'string' && typeof p.cohort === 'string' && typeof p.expiresAt === 'number' ? p : null
  } catch {
    return null
  }
}
