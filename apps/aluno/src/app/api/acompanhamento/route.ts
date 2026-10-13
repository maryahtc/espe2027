import { loadAuth } from '@/lib/auth/session'
import { loadCohortTracking, trackingCohorts } from '@/lib/tracking/load'
import { trackingCsv } from '@/lib/tracking/model'

export const dynamic = 'force-dynamic'

/** Planilha do progresso na biblioteca (CSV). Só admin e coordenação da turma. */
export async function GET(request: Request) {
  const auth = await loadAuth()
  if (!auth || auth === 'previa' || auth.needsTerms || (auth.role !== 'admin' && auth.role !== 'coordenacao')) {
    return new Response('Não encontrado', { status: 404 })
  }
  const cohortId = new URL(request.url).searchParams.get('turma') ?? ''
  const cohort = (await trackingCohorts(auth)).find((c) => c.id === cohortId)
  if (!cohort) return new Response('Não encontrado', { status: 404 })
  const data = await loadCohortTracking(cohort.id)
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  return new Response(trackingCsv(data), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="progresso-biblioteca-${cohort.slug}-${day}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
