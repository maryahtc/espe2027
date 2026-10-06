import { errorMessage } from '@/lib/log'
import { getPortalData } from '@/server/data/repository'
import { isAuthorized, noStoreHeaders } from '@/server/http/auth'

export const dynamic = 'force-dynamic'

/**
 * Diagnóstico da integração: última sincronização, contagens e problemas por
 * aba/linha/campo. Nunca inclui valores de células. Protegido por segredo.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false }, { status: 401, headers: noStoreHeaders })
  }
  try {
    const { report } = await getPortalData()
    return Response.json({ ok: true, ...report }, { headers: noStoreHeaders })
  } catch (error) {
    return Response.json({ ok: false, error: errorMessage(error) }, { status: 503, headers: noStoreHeaders })
  }
}
