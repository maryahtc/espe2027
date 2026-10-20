import Link from 'next/link'
import { exitSimulation } from '@/lib/simulation/actions'

const hour = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

/** "Especialização Conexo | Turma 2027" → "Turma 2027". */
export const shortCohort = (name: string) => name.split('|').at(-1)?.trim() || name

export const SIM_BANNER_H = '2.75rem'

/** Sair da simulação: descarta todo o rascunho e volta ao Admin. */
export function ExitSimulationButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={exitSimulation}>
      <button
        type="submit"
        data-sair-simulacao
        className={
          compact
            ? 'min-h-8 rounded-full bg-black px-3 text-xs font-bold text-[#ffc21a] hover:bg-black/80'
            : 'min-h-11 rounded-full border border-[#ffc21a]/70 px-5 text-sm font-semibold text-[#ffc21a] hover:bg-[#ffc21a]/10'
        }
      >
        Sair da simulação
      </button>
    </form>
  )
}

/**
 * Faixa fixa no topo de todas as telas enquanto a simulação estiver ativa. Cor que o portal não usa para mais
 * nada (âmbar listrado), para não haver dúvida de que nada ali é real.
 */
export function SimulationBanner({
  cohortName,
  expiresAt,
  backToStudent = false,
  fixed = false,
}: {
  cohortName: string
  expiresAt: number
  backToStudent?: boolean
  /** Telas sem rolagem própria (termo): fixa no topo da janela. */
  fixed?: boolean
}) {
  return (
    <div
      role="status"
      data-simulacao-faixa
      style={{ height: SIM_BANNER_H }}
      className={`${fixed ? 'fixed inset-x-0' : 'sticky'} top-0 z-50 flex items-center justify-between gap-3 bg-[repeating-linear-gradient(135deg,#ffc21a_0,#ffc21a_16px,#f2b000_16px,#f2b000_32px)] px-3 text-black shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:px-5`}
    >
      <p className="min-w-0 truncate text-[12px] font-bold tracking-wide sm:text-[13px]">
        <span className="hidden sm:inline">MODO DE SIMULAÇÃO</span>
        <span className="sm:hidden">SIMULAÇÃO</span> · {shortCohort(cohortName)} · nada é salvo
        <span className="hidden font-semibold md:inline"> · termina às {hour.format(new Date(expiresAt))}</span>
      </p>
      <span className="flex shrink-0 items-center gap-2">
        {backToStudent ? (
          <Link href="/" className="hidden rounded-full px-3 py-1 text-xs font-bold underline underline-offset-2 sm:inline">
            Voltar à simulação
          </Link>
        ) : null}
        <ExitSimulationButton compact />
      </span>
    </div>
  )
}
