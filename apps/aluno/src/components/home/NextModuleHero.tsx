import { ButtonLink } from '@portal/ui/button'
import { IconArrowRight } from '@portal/ui/icons'
import { daysBetween, formatRange, weekday, weekdayShort, day } from '@/lib/dates'
import type { DemoModule, ScheduleItem } from '@/demo/data'

/**
 * O elemento mais importante da Home. O número do módulo ocupa um bloco vermelho —
 * o mesmo gesto do "co" no logo Conexo.
 */
export function NextModuleHero({
  module,
  today,
  description,
  days,
  pendingRequired,
}: {
  module: DemoModule
  today: string
  description: string
  days: Array<{ date: string; items: ScheduleItem[] }>
  pendingRequired: number
}) {
  const inDays = daysBetween(today, module.start)
  return (
    <section aria-labelledby="proximo-modulo" className="reveal relative overflow-hidden rounded-lg border border-rule bg-surface">
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-12 lg:gap-10 lg:p-12">
        <div className="lg:col-span-8">
          <p className="eyebrow flex items-center gap-2">
            Próximo módulo
            <span className="size-1 rounded-full bg-brand" />
            <span className="text-ink">{inDays === 1 ? 'amanhã' : `em ${inDays} dias`}</span>
          </p>

          <div className="mt-6 flex items-start gap-5 sm:gap-7">
            <div
              aria-hidden="true"
              className="num flex size-[84px] shrink-0 items-center justify-center bg-brand text-[44px] leading-none font-light text-white sm:size-[120px] sm:text-[64px] lg:size-[136px] lg:text-[72px]"
            >
              {module.slug}
            </div>
            <div className="min-w-0 pt-0.5">
              <h1 id="proximo-modulo" className="text-[1.875rem] leading-[1.05] font-light tracking-tight sm:text-5xl lg:text-[3.5rem]">
                <span className="sr-only">Módulo {module.number}: </span>
                {module.title}
              </h1>
              <p className="num mt-3 text-lg text-ink sm:text-xl">
                {formatRange(module.start, module.end)}
                <span className="block font-sans text-sm text-muted sm:ml-2 sm:inline">
                  {weekday(module.start)} a {weekday(module.end)}
                </span>
              </p>
            </div>
          </div>

          <p className="mt-6 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">{description}</p>
          <p className="mt-4 text-sm">
            <span className="text-muted">Com </span>
            {module.teachers.map((t, i) => (
              <span key={t.slug}>
                <span className="font-semibold">{t.short}</span>
                {i < module.teachers.length - 2 ? ', ' : i === module.teachers.length - 2 ? ' e ' : ''}
              </span>
            ))}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={`/modulos/${module.slug}`}>
              Ver programação <IconArrowRight size={16} />
            </ButtonLink>
            <ButtonLink href="#preparacao" variant="secondary">
              {pendingRequired > 0 ? `Preparação · ${pendingRequired} pendentes` : 'Preparação concluída'}
            </ButtonLink>
          </div>
        </div>

        <aside aria-label="Dias do módulo" className="border-t border-rule pt-6 lg:col-span-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
          <p className="eyebrow">Os três dias</p>
          <ol className="mt-4 divide-y divide-rule">
            {days.map((d) => {
              const kinds = [...new Set(d.items.map((i) => i.type))]
              return (
                <li key={d.date} className="flex gap-4 py-3.5">
                  <span className="w-10 shrink-0 text-center">
                    <span className="eyebrow block text-[10px]">{weekdayShort(d.date)}</span>
                    <span className="num block text-2xl leading-none font-light">{day(d.date)}</span>
                  </span>
                  <span className="min-w-0 text-sm">
                    <span className="block font-semibold">{kinds.join(' · ')}</span>
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
