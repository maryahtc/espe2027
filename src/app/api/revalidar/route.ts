import { revalidatePath, revalidateTag } from 'next/cache'
import { cacheConfig } from '@/config/cache'
import { log } from '@/lib/log'
import { isAuthorized, noStoreHeaders } from '@/server/http/auth'

/**
 * Força a atualização dos dados da planilha.
 *   curl -X POST https://SEU-PORTAL/api/revalidar -H "Authorization: Bearer $REVALIDATE_SECRET"
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false }, { status: 401, headers: noStoreHeaders })
  }
  // Dados marcados como vencidos: a próxima visita busca a planilha de novo.
  revalidateTag(cacheConfig.tag, { expire: 0 })
  revalidatePath('/', 'layout')
  log.info('portal.revalidated')
  return Response.json({ ok: true, revalidatedAt: new Date().toISOString() }, { headers: noStoreHeaders })
}
