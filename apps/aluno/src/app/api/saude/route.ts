import { checkDatabase } from '@portal/db/health'

export const dynamic = 'force-dynamic'

/**
 * Verificação de saúde: o app respondeu e o banco está acessível?
 * Com HEALTH_SECRET definido, exige `Authorization: Bearer <segredo>`. Não devolve dados.
 */
export async function GET(request: Request) {
  const secret = process.env.HEALTH_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Não encontrado', { status: 404 })
  }
  const database = await checkDatabase()
  const ok = database.status !== 'erro'
  return Response.json(
    { app: 'ok', database, checkedAt: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
