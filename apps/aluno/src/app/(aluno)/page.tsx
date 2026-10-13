import { EmptyState } from '@portal/ui/empty-state'
import { IconArrowRight } from '@portal/ui/icons'
import { ModuleRuler } from '@portal/ui/module-ruler'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { HomeSection } from '@/components/home/HomeSection'
import { NextModuleHero } from '@/components/home/NextModuleHero'
import { LibraryRow } from '@/components/modules/LibraryRow'
import { ResourceRow } from '@/components/modules/ResourceRow'
import type { ModuleVM } from '@/lib/academic/model'
import { getAuth } from '@/lib/auth/session'
import { daysBetween, formatDayMonth, formatLongDay, monthLong, monthShort, relativeDays, weekdayShort, year, day } from '@/lib/dates'
import { loadHome, parsePreview } from '@/lib/home/load'
import { KIND_LABEL } from '@/lib/library/model'

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function firstName(auth: Awaited<ReturnType<typeof getAuth>>) {
  if (!auth || auth === 'previa') return null
  const name = (auth.displayName || auth.fullName).trim()
  return name ? (name.split(/\s+/)[0] ?? null) : null
}

const rulerState = (m: ModuleVM) => (m.state === 'done' ? 'done' : m.state === 'next' || m.state === 'ongoing' ? 'next' : 'upcoming')
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Início do aluno: "o que está acontecendo e o que eu preciso fazer agora?".
 * O próximo módulo aparece sempre; pendências de preparação só nos 30 dias anteriores a ele (ou durante).
 */
export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await getAuth()
  const preview = parsePreview(auth, await searchParams)
  const home = await loadHome(auth, preview)
  const name = firstName(auth)

  if (!home) {
    return (
      <div className="space-y-10">
        <Greeting date={null} name={name} />
        <EmptyState title="Sua turma ainda não foi vinculada">
          Assim que a coordenação vincular sua conta a uma turma, o cronograma e os módulos aparecem aqui.
        </EmptyState>
      </div>
    )
  }

  const { cohort, today, modules, focus, moment, pending, prep } = home
  const done = modules.filter((m) => m.state === 'done').length
  const focusIdx = focus ? modules.findIndex((m) => m.id === focus.id) : -1
  const previousModule = focusIdx > 0 ? modules[focusIdx - 1] : null
  const followingModule = focusIdx >= 0 ? modules[focusIdx + 1] : null
  const prepCount = prep.library.length + prep.resources.length
  const closed = moment === 'encerrada'

  // Numeração das seções na ordem em que aparecem.
  let n = 0
  const idx = () => String(++n).padStart(2, '0')

  return (
    <div className="space-y-10 lg:space-y-14">
      {home.preview ? (
        <div role="status" className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3 text-sm">
          <span>
            <span className="font-semibold text-signal">Pré-visualização</span> · {home.preview.cohort} em{' '}
            <span className="num text-ink">{formatDayMonth(home.preview.date)}/{year(home.preview.date)}</span> · como o aluno veria; nada é gravado.
          </span>
          <Link href="/" className="text-xs font-semibold hover:underline">
            Sair da pré-visualização
          </Link>
        </div>
      ) : null}

      <Greeting date={today} name={name} />

      {moment === 'antes-inicio' ? (
        <div role="note" className="glass reveal rounded-2xl p-5 sm:p-6">
          <p className="eyebrow flex items-center gap-2">
            <span className="glow-dot !size-1.5" /> Boas-vindas
          </p>
          <p className="mt-2 text-xl font-light tracking-tight sm:text-2xl">Boas-vindas à {cohort.name}.</p>
          <p className="mt-1 text-sm text-muted">
            A especialização começa em {monthLong(cohort.startsOn)} de {year(cohort.startsOn)} · faltam{' '}
            <span className="num text-ink">{plural(daysBetween(today, cohort.startsOn), 'dia', 'dias')}</span>.{' '}
            {home.window && focus
              ? `A preparação do Módulo ${focus.label} já está abaixo.`
              : 'Por enquanto, nada a fazer: a preparação de cada módulo aparece aqui 30 dias antes dele.'}
          </p>
        </div>
      ) : null}

      {closed ? (
        <div role="note" className="glass reveal rounded-2xl p-5 sm:p-6">
          <p className="eyebrow">Especialização concluída</p>
          <p className="mt-2 text-xl font-light tracking-tight sm:text-2xl">A {cohort.name} terminou.</p>
          <p className="mt-1 text-sm text-muted">Os módulos e o cronograma continuam disponíveis para consulta.</p>
        </div>
      ) : null}

      {moment === 'sem-modulos' ? (
        <EmptyState title="Programação em preparação">A coordenação ainda está publicando os módulos da sua turma. Eles aparecem aqui assim que forem publicados.</EmptyState>
      ) : null}

      {!closed && focus && focus.start && focus.end ? (
        <NextModuleHero
          module={{ ...focus, start: focus.start, end: focus.end }}
          today={today}
          prep={home.window ? { count: prepCount, required: { done: pending.required.done, total: pending.required.total } } : null}
          windowOpens={home.windowOpens}
        />
      ) : null}

      {/* O que fazer agora: só pendências reais; fora da janela, uma mensagem calma. */}
      {!closed && moment !== 'sem-modulos' ? (
        <HomeSection id="agora" index={idx()} title="O que fazer agora">
          {pending.clear ? (
            <p className="text-[15px] text-ink-2">
              {home.window && focus
                ? `Tudo em dia para o Módulo ${focus.label}.`
                : focus && home.windowOpens
                  ? `Nada pendente agora. A preparação do Módulo ${focus.label} aparece aqui a partir de ${formatDayMonth(home.windowOpens)}.`
                  : 'Nada pendente agora.'}
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {pending.required.open.map((l) => (
                <Todo key={l.contentId} href={`/biblioteca/${l.slug}`} title={l.title} detail={`Obrigatório · ${KIND_LABEL[l.kind as keyof typeof KIND_LABEL] ?? 'Conteúdo'}${l.progress === 'iniciado' ? ' · em andamento' : ''}`} />
              ))}
              {pending.materials.total > pending.materials.checked && focus ? (
                <Todo
                  href={`/modulos/${focus.id}#materiais`}
                  title="Conferir a lista de materiais"
                  detail={`${pending.materials.checked} de ${plural(pending.materials.total, 'item separado', 'itens separados')}`}
                />
              ) : null}
              {pending.deadlines.map((d) => (
                <Todo key={`${d.title}-${d.date}`} href={d.href} title={d.title} detail={`Prazo ${formatDayMonth(d.date)} · ${relativeDays(today, d.date)}`} />
              ))}
            </ul>
          )}
        </HomeSection>
      ) : null}

      {/* Preparação: só dentro da janela de 30 dias (ou durante o módulo). */}
      {!closed && home.window && focus ? (
        <HomeSection id="preparacao" index={idx()} title="Preparação" note={<>Para o Módulo {focus.label}.</>}>
          {prep.note ? <p className="max-w-[62ch] text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{prep.note}</p> : null}
          {prepCount ? (
            <ul className="mt-2 divide-y divide-rule">
              {prep.library.map((l) => (
                <LibraryRow key={l.contentId} item={l} />
              ))}
              {prep.resources.map((r) => (
                <ResourceRow key={r.id} item={r} />
              ))}
            </ul>
          ) : !prep.note ? (
            <p className="text-sm text-muted">A coordenação ainda não publicou a preparação deste módulo.</p>
          ) : null}
        </HomeSection>
      ) : null}

      {home.after ? (
        <HomeSection id="depois" index={idx()} title="Depois do módulo" note={<>Módulo {home.after.module.label} · {home.after.module.title}</>}>
          {home.after.library.length ? (
            <ul className="divide-y divide-rule">
              {home.after.library.map((l) => (
                <LibraryRow key={l.contentId} item={l} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Revise o que foi visto no módulo quando quiser.</p>
          )}
          <Link href={`/modulos/${home.after.module.id}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
            Abrir o Módulo {home.after.module.label} <IconArrowRight size={15} />
          </Link>
        </HomeSection>
      ) : null}

      {!closed ? (
        <HomeSection id="proximas" index={idx()} title="Próximas atividades" note="Nos próximos 30 dias.">
          {home.agenda.length ? (
            <ul className="divide-y divide-rule">
              {home.agenda.map((a) => (
                <li key={`${a.date}-${a.title}`}>
                  <Link href={a.href} className="group flex items-center gap-4 py-3">
                    <span className="w-10 shrink-0 text-center">
                      <span className="eyebrow block text-[10px]">{weekdayShort(a.date)}</span>
                      <span className="num block text-2xl leading-tight font-light">{day(a.date)}</span>
                      <span className="block text-[10px] text-muted">{monthShort(a.date)}</span>
                    </span>
                    <span className="min-w-0 border-l border-rule pl-4 text-sm">
                      <span className="block font-semibold group-hover:underline">{a.title}</span>
                      {a.detail ? <span className="num block text-xs text-muted">{a.detail}</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nenhuma atividade nos próximos 30 dias.</p>
          )}
          <Link href="/cronograma" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
            Ver cronograma completo <IconArrowRight size={15} />
          </Link>
        </HomeSection>
      ) : null}

      {home.continuing.length ? (
        <HomeSection id="continuar" index={idx()} title="Continuar" note="Conteúdos que você começou.">
          <ul className="divide-y divide-rule">
            {home.continuing.map((c) => (
              <li key={c.id}>
                <Link href={`/biblioteca/${c.slug}`} className="group flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block font-semibold group-hover:underline">{c.title}</span>
                    <span className="block text-xs text-muted">
                      {KIND_LABEL[c.kind]} · {c.category}
                    </span>
                  </span>
                  <span className="num shrink-0 text-xs text-muted">{c.progress?.percent ?? 0}%</span>
                </Link>
              </li>
            ))}
          </ul>
        </HomeSection>
      ) : null}

      <HomeSection id="especializacao" index={idx()} title="Sua especialização">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          {home.month.current > 0 ? (
            <p className="text-lg">
              <span className="text-muted">Mês </span>
              <span className="num text-3xl font-light">{home.month.current}</span>
              <span className="text-muted"> de {home.month.total}</span>
            </p>
          ) : (
            <p className="text-lg">
              <span className="text-muted">Começa em </span>
              <span className="text-ink">
                {monthLong(cohort.startsOn)} de {year(cohort.startsOn)}
              </span>
            </p>
          )}
          <p className="text-sm text-muted">
            <span className="num font-semibold text-ink">{done}</span> {done === 1 ? 'módulo concluído' : 'módulos concluídos'} · <span className="num">{modules.length - done}</span> pela frente
            {home.required.total ? (
              <>
                {' '}
                · <span className="num text-ink">{home.required.done}</span>/<span className="num">{home.required.total}</span> obrigatórios da biblioteca até agora
              </>
            ) : null}
          </p>
        </div>
        {modules.length ? (
          <ModuleRuler
            className="mt-6"
            modules={modules.map((m, i) => ({ number: m.number ?? i + 1, label: m.title, state: rulerState(m), href: `/modulos/${m.id}` }))}
          />
        ) : null}
        {focus ? (
          <div className="glass mt-6 grid overflow-hidden rounded-2xl sm:grid-cols-3 sm:divide-x sm:divide-white/[0.08]">
            {[
              { label: 'Anterior', m: previousModule, note: previousModule?.state === 'done' ? 'Concluído' : '' },
              {
                label: focus.state === 'ongoing' ? 'Agora' : 'Próximo',
                m: focus,
                note: focus.state === 'ongoing' ? 'Em andamento' : focus.start ? relativeDays(today, focus.start) : '',
              },
              { label: 'Depois', m: followingModule, note: followingModule?.start ? `${monthShort(followingModule.start)} ${year(followingModule.start)}` : '' },
            ].map(({ label, m, note }) =>
              m ? (
                <Link
                  key={label}
                  href={`/modulos/${m.id}`}
                  className={`group relative block p-5 transition-colors hover:bg-white/[0.04] ${m === focus ? 'bg-white/[0.03]' : ''}`}
                >
                  <p className="eyebrow flex items-center gap-2">
                    {m === focus ? <span className="glow-dot !size-1.5" /> : null}
                    {label}
                  </p>
                  <p className="mt-2 flex items-baseline gap-2">
                    <span className={`num text-sm font-semibold ${m === focus ? 'text-signal' : 'text-muted'}`}>{m.label}</span>
                    <span className="text-[15px] leading-snug font-semibold">{m.title}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">{note}</p>
                </Link>
              ) : (
                <span key={label} />
              ),
            )}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/cronograma" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
            Cronograma <IconArrowRight size={15} />
          </Link>
          <Link href="/modulos" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
            Módulos <IconArrowRight size={15} />
          </Link>
          <Link href="/biblioteca" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline">
            Biblioteca <IconArrowRight size={15} />
          </Link>
        </div>
      </HomeSection>
    </div>
  )
}

function Greeting({ date, name }: { date: string | null; name: string | null }) {
  return (
    <p className="reveal text-sm text-muted">
      {date ? capitalize(formatLongDay(date)) : null}
      {name ? (
        <>
          {date ? ' · ' : ''}Olá, <span className="text-ink">{name}</span>
        </>
      ) : null}
    </p>
  )
}

function Todo({ href, title, detail }: { href: string; title: string; detail: ReactNode }) {
  return (
    <li>
      <Link href={href} className="group flex items-center justify-between gap-4 py-3">
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold group-hover:underline">{title}</span>
          <span className="block text-xs text-muted">{detail}</span>
        </span>
        <IconArrowRight size={15} className="shrink-0 text-muted" />
      </Link>
    </li>
  )
}
