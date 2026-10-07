import { ButtonLink } from '@portal/ui/button'
import { IconArrowRight } from '@portal/ui/icons'
import { ACTIVITY_LABEL, type ModuleVM, sessionTime } from '@/lib/academic/model'
import { day, daysBetween, formatRange, weekday, weekdayShort } from '@/lib/dates'

/**
 * O elemento dominante da Início: uma superfície de vidro escuro com o número do módulo em grande escala.
 * Vermelho só nos detalhes: ponto de luz, contagem e ação principal.
 */
export function NextModuleHero({
  module,
  today,
  preparationCount,
  requiredCount,
}: {
  module: ModuleVM & { start: string; end: string }
  today: string
  /** Itens publicados de "antes do módulo" (o acompanhamento de conclusão chega com a biblioteca). */
  preparationCount: number
  requiredCount: number
}) {
  const inDays = daysBetween(today, module.start)
  const ongoing = module.state === 'ongoing'
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
            <span className="glow-dot" /> {ongoing ? 'Módulo em andamento' : 'Próximo módulo'}
          </p>

          <div className="mt-6 flex items-end gap-5 sm:gap-8">
            <span
              aria-hidden="true"
              className="num block text-[112px] leading-[0.78] font-extralight tracking-[-0.06em] text-ink sm:text-[168px] lg:text-[200px]"
            >
              {module.label}
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

          {module.theme || module.description ? (
            <p className="mt-6 max-w-[58ch] text-[15px] leading-relaxed text-ink-2">{module.description || module.theme}</p>
          ) : null}
          {module.teachers.length ? (
            <p className="mt-4 text-sm text-muted">
              Com{' '}
              {module.teachers.map((t, i) => (
                <span key={t.id}>
                  <span className="text-ink">{t.name}</span>
                  {t.tentative ? ' (a confirmar)' : ''}
                  {i < module.teachers.length - 2 ? ', ' : i === module.teachers.length - 2 ? ' e ' : ''}
                </span>
              ))}
            </p>
          ) : null}

          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href={`/modulos/${module.id}`}>
              Ver programação <IconArrowRight size={16} />
            </ButtonLink>
            <ButtonLink href="#preparacao" variant="secondary">
              {preparationCount > 0 ? (
                <>
                  Preparação · <span className="num text-signal">{preparationCount}</span> {preparationCount === 1 ? 'item' : 'itens'}
                </>
              ) : (
                'Preparação'
              )}
            </ButtonLink>
          </div>
        </div>

        <aside aria-label="Contagem e dias do módulo" className="flex flex-col border-t border-rule pt-8 lg:col-span-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
          {ongoing ? (
            <p className="text-sm leading-tight text-muted">Acontecendo agora</p>
          ) : (
            <p className="flex items-baseline gap-3">
              <span className="num text-6xl leading-none font-extralight text-ink sm:text-7xl">{inDays}</span>
              <span className="text-sm leading-tight text-muted">
                {inDays === 1 ? 'dia' : 'dias'}
                <br />
                para o módulo
              </span>
            </p>
          )}
          <p className="mt-6 flex justify-between text-xs text-muted">
            <span>Preparação obrigatória</span>
            <span className="num text-ink">{requiredCount ? `${requiredCount} ${requiredCount === 1 ? 'item' : 'itens'}` : '—'}</span>
          </p>

          <ol className="mt-10 space-y-1">
            {module.days.map((d) => {
              const kinds = [...new Set(d.sessions.map((s) => ACTIVITY_LABEL[s.type]))]
              return (
                <li key={d.id} className="flex items-start gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-white/[0.04]">
                  <span className="w-9 shrink-0 text-center">
                    <span className="eyebrow block text-[10px]">{weekdayShort(d.date)}</span>
                    <span className="num block text-2xl leading-tight font-light">{day(d.date)}</span>
                  </span>
                  <span className="min-w-0 pt-0.5 text-sm">
                    <span className="block text-ink">{kinds.length ? kinds.join(' · ') : 'Programação em definição'}</span>
                    {d.sessions.length ? (
                      <span className="num block text-xs text-muted">
                        {[...new Set(d.sessions.map((s) => sessionTime(s)))].join(' · ')}
                      </span>
                    ) : null}
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
