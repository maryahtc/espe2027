import { ButtonLink } from '@portal/ui/button'
import { IconArrowRight } from '@portal/ui/icons'
import type { DemoModule, ScheduleItem } from '@/demo/data'
import { day, daysBetween, formatRange, weekday, weekdayShort } from '@/lib/dates'

/**
 * O elemento dominante da Início: uma superfície de vidro escuro com o número do módulo em grande escala.
 * Vermelho só nos detalhes: ponto de luz, contagem e ação principal.
 */
export function NextModuleHero({
  module,
  today,
  description,
  days,
  pendingRequired,
  requiredTotal,
}: {
  module: DemoModule
  today: string
  description: string
  days: Array<{ date: string; items: ScheduleItem[] }>
  pendingRequired: number
  requiredTotal: number
}) {
  const inDays = daysBetween(today, module.start)
  return (
    <section aria-labelledby="proximo-modulo" className="glass glass-sheen reveal relative overflow-hidden rounded-[28px]">
      {/* Luz atrás do número — o único "brilho" da tela */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-32 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(202,44,44,0.22),transparent_62%)]"
      />
      <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-14">
        <div className="lg:col-span-8">
          <p className="eyebrow flex items-center gap-2.5">
            <span className="glow-dot" /> Próximo módulo
          </p>

          <div className="mt-6 flex items-end gap-5 sm:gap-8">
            <span
              aria-hidden="true"
              className="num block text-[112px] leading-[0.78] font-extralight tracking-[-0.06em] text-ink sm:text-[168px] lg:text-[200px]"
            >
              {module.slug}
            </span>
            <span className="mb-2 hidden h-px flex-1 bg-gradient-to-r from-[var(--brand)] to-transparent sm:block" />
          </div>

          <h1 id="proximo-modulo" className="mt-6 max-w-[16ch] text-[2.1rem] leading-[1.04] font-light tracking-tight text-balance sm:text-5xl lg:text-[3.6rem]">
            <span className="sr-only">Módulo {module.number}: </span>
            {module.title}
          </h1>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="num text-xl text-ink sm:text-2xl">{formatRange(module.start, module.end)}</span>
            <span className="text-sm text-muted">
              {weekday(module.start)} a {weekday(module.end)}
            </span>
          </p>

          <p className="mt-6 max-w-[58ch] text-[15px] leading-relaxed text-ink-2">{description}</p>
          <p className="mt-4 text-sm text-muted">
            Com{' '}
            {module.teachers.map((t, i) => (
              <span key={t.slug}>
                <span className="text-ink">{t.short}</span>
                {i < module.teachers.length - 2 ? ', ' : i === module.teachers.length - 2 ? ' e ' : ''}
              </span>
            ))}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href={`/modulos/${module.slug}`}>
              Ver programação <IconArrowRight size={16} />
            </ButtonLink>
            <ButtonLink href="#preparacao" variant="secondary">
              {pendingRequired > 0 ? (
                <>
                  Preparação · <span className="num text-signal">{pendingRequired}</span> pendentes
                </>
              ) : (
                'Preparação concluída'
              )}
            </ButtonLink>
          </div>
        </div>

        <aside aria-label="Contagem e dias do módulo" className="flex flex-col border-t border-rule pt-8 lg:col-span-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
          <p className="flex items-baseline gap-3">
            <span className="num text-6xl leading-none font-extralight text-ink sm:text-7xl">{inDays}</span>
            <span className="text-sm leading-tight text-muted">
              {inDays === 1 ? 'dia' : 'dias'}
              <br />
              para o módulo
            </span>
          </p>
          <p className="mt-6 flex justify-between text-xs text-muted">
            <span>Preparação obrigatória</span>
            <span className="num text-ink">
              {requiredTotal - pendingRequired}/{requiredTotal}
            </span>
          </p>
          <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.08]">
            <span
              className="block h-full rounded-full bg-brand"
              style={{ width: `${((requiredTotal - pendingRequired) / Math.max(1, requiredTotal)) * 100}%` }}
            />
          </div>

          <ol className="mt-10 space-y-1">
            {days.map((d) => {
              const kinds = [...new Set(d.items.map((i) => i.type))]
              return (
                <li key={d.date} className="flex items-start gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-white/[0.04]">
                  <span className="w-9 shrink-0 text-center">
                    <span className="eyebrow block text-[10px]">{weekdayShort(d.date)}</span>
                    <span className="num block text-2xl leading-tight font-light">{day(d.date)}</span>
                  </span>
                  <span className="min-w-0 pt-0.5 text-sm">
                    <span className="block text-ink">{kinds.join(' · ')}</span>
                    <span className="num block text-xs text-muted">
                      {d.items[0]?.start}–{d.items.at(-1)?.end}
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
        </aside>
      </div>
    </section>
  )
}
