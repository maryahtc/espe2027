import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ExitSimulationButton, shortCohort } from '@/components/simulation/SimulationBanner'
import { viewerCohorts } from '@/lib/academic/load'
import { requireUser } from '@/lib/auth/session'
import { formatRange } from '@/lib/dates'
import { startSimulation } from '@/lib/simulation/actions'
import { simulationAvailable } from '@/lib/simulation/seal'
import { getSimulation } from '@/lib/simulation/session'

export const metadata: Metadata = { title: 'Ver portal como aluno' }

const MESSAGES: Record<string, string> = {
  saiu: 'Simulação encerrada. Todo o rascunho foi descartado.',
  expirou: 'A simulação chegou ao limite de 2 horas e foi encerrada. Todo o rascunho foi descartado.',
  indisponivel: 'Simulação indisponível neste ambiente (falta a chave do servidor).',
  turma: 'Turma não encontrada.',
}

/** Modo de simulação do aluno: o Admin escolhe a turma e percorre o portal como um aluno novo dela. Nada é salvo. */
export default async function SimulationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser(['admin'])
  const sp = await searchParams
  const [cohorts, sim] = await Promise.all([viewerCohorts(), getSimulation()])
  const notice = sp.saiu ? MESSAGES.saiu : sp.expirou ? MESSAGES.expirou : sp.erro ? MESSAGES[sp.erro] : null
  const available = simulationAvailable()

  return (
    <>
      <PageTitle
        eyebrow="Modo de simulação"
        title="Ver portal como aluno"
        lead="Escolha uma turma para percorrer o portal exatamente como um aluno novo dela — inclusive registrar casos, marcar conteúdos e aceitar o termo."
      />

      {notice ? (
        <p role="status" className="glass mb-6 rounded-2xl border-l-2 border-l-[#ffc21a] px-5 py-4 text-sm">
          {notice}
        </p>
      ) : null}

      {sim ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#ffc21a]/60 bg-[#ffc21a]/[0.06] px-5 py-4">
          <p className="text-sm">
            <span className="font-semibold text-[#ffc21a]">Simulação ativa</span> · {shortCohort(sim.cohortVM.name)}
          </p>
          <span className="flex flex-wrap items-center gap-3">
            <Link href="/" className="inline-flex min-h-11 items-center rounded-full bg-[#ffc21a] px-5 text-sm font-semibold text-black hover:bg-[#ffd04d]">
              Voltar à simulação
            </Link>
            <ExitSimulationButton />
          </span>
        </div>
      ) : null}

      <section className="glass mb-8 rounded-2xl p-5 text-sm leading-relaxed sm:p-6">
        <h2 className="eyebrow">Como funciona</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-2">
          <li>
            <span className="font-semibold text-ink">Nada é salvo.</span> Casos, progresso, checklist, “Entendi” nos avisos e o aceite do termo ficam num
            rascunho temporário, só nesta sessão do navegador.
          </li>
          <li>O rascunho é descartado ao sair da simulação ou depois de 2 horas. Não entra nos dados nem nos indicadores da turma.</li>
          <li>Você vê só o que um aluno da turma vê: módulos, conteúdos e avisos publicados para ela.</li>
          <li>Fotos escolhidas na simulação ficam só neste navegador e nunca são enviadas.</li>
          <li>Sua conta continua sendo Admin. Uma faixa âmbar no topo indica a simulação em todas as telas.</li>
        </ul>
      </section>

      {!available ? (
        <p className="text-sm text-muted">{MESSAGES.indisponivel}</p>
      ) : cohorts.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {cohorts.map((c) => (
            <li key={c.id} data-turma={c.slug} className="glass flex flex-col justify-between gap-5 rounded-2xl p-5">
              <span>
                <span className="block text-lg font-light">{c.name}</span>
                <span className="mt-1 block text-sm text-muted">
                  {formatRange(c.startsOn, c.endsOn)} · {c.status === 'ativa' ? 'ativa' : 'encerrada (somente consulta)'}
                </span>
              </span>
              <form action={startSimulation}>
                <input type="hidden" name="turma" value={c.id} />
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-full bg-[#ffc21a] px-5 text-sm font-semibold text-black hover:bg-[#ffd04d]"
                >
                  Entrar como aluno desta turma
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nenhuma turma cadastrada.</p>
      )}
    </>
  )
}
