'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  type Answer,
  type InfoStep,
  type PlaybookState,
  type QuestionStep,
  type Stage,
  buildProtocol,
  conduct,
  initialState,
  protocolText,
  stageOf,
  stageStatus,
  stages,
  steps,
} from './flow'

type Mode = 'guiado' | 'mapa'

const answerLabel: Record<Answer, string> = { sim: 'SIM', nao: 'NÃO' }

/** Registra a resposta; só avança se for a pergunta da vez (no mapa dá para responder fora de ordem). */
function applyAnswer(s: PlaybookState, index: number, value: Answer): PlaybookState {
  return {
    ...s,
    answers: { ...s.answers, [steps[index]!.id]: value },
    done: index === s.done ? s.done + 1 : s.done,
  }
}

export function PlaybookApp() {
  const [state, setState] = useState<PlaybookState>(initialState)
  const [mode, setMode] = useState<Mode>('guiado')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)

  // Leva o foco (e a leitura de tela) para o passo novo a cada avanço.
  useEffect(() => {
    if (!moved.current) return
    headingRef.current?.focus({ preventScroll: true })
    headingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [state.done])

  function answer(index: number, value: Answer) {
    moved.current = true
    setState((s) => applyAnswer(s, index, value))
  }

  function complete(index: number) {
    moved.current = true
    setState((s) => (index === s.done ? { ...s, done: s.done + 1 } : s))
  }

  /** Volta para um passo já respondido; o que vinha depois é refeito. */
  function revisit(index: number) {
    moved.current = true
    setState((s) => {
      const keep = new Set(steps.slice(0, index).map((st) => st.id))
      const answers = Object.fromEntries(Object.entries(s.answers).filter(([id]) => keep.has(id)))
      const effects = keep.has('maquiagem') ? s.effects : []
      return { done: index, answers, effects }
    })
  }

  function toggleEffect(effect: string) {
    setState((s) => ({
      ...s,
      effects: s.effects.includes(effect) ? s.effects.filter((e) => e !== effect) : [...s.effects, effect],
    }))
  }

  function restart() {
    moved.current = true
    setState(initialState)
    setMode('guiado')
  }

  // Atalhos: S / N respondem a pergunta atual; Enter conclui uma etapa informativa.
  useEffect(() => {
    if (mode !== 'guiado') return
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable]')) return
      const step = steps[state.done]
      if (!step) return
      const key = e.key.toLowerCase()
      if (step.kind === 'question' && (key === 's' || key === 'n')) {
        e.preventDefault()
        moved.current = true
        const index = state.done
        setState((s) => applyAnswer(s, index, key === 's' ? 'sim' : 'nao'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, state.done])

  const finished = state.done >= steps.length

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-16 md:px-8">
      <nav className="flex items-center justify-between gap-4 py-5 text-sm">
        <Link href="/" className="text-pb-muted transition-colors hover:text-pb-text">
          ← Portal
        </Link>
        <ModeSwitch mode={mode} onChange={setMode} />
      </nav>

      <Brand />

      <section className="mt-8 rounded-[28px] border-2 border-pb-line/80 px-4 py-8 sm:px-8 md:mt-12 md:rounded-[44px] md:px-14 md:py-14">
        {mode === 'guiado' ? (
          <>
            <StageRail state={state} />
            <div className="mx-auto mt-10 max-w-[760px]">
              <History state={state} onRevisit={revisit} />
              {finished ? (
                <Protocol state={state} headingRef={headingRef} onRestart={restart} onMap={() => setMode('mapa')} />
              ) : (
                <CurrentStep
                  key={steps[state.done]!.id}
                  index={state.done}
                  state={state}
                  headingRef={headingRef}
                  onAnswer={answer}
                  onComplete={complete}
                  onToggleEffect={toggleEffect}
                />
              )}
            </div>
          </>
        ) : (
          <FlowMap state={state} onAnswer={answer} onToggleEffect={toggleEffect} onRestart={restart} />
        )}
      </section>
    </div>
  )
}

/* ── Marca ─────────────────────────────────────────────────────────────── */

function Brand() {
  return (
    <header className="flex flex-col items-center text-center">
      <h1 className="text-[clamp(2.75rem,10vw,5.5rem)] leading-[0.9] font-black tracking-[-0.01em] text-pb-red uppercase">
        Playbook
      </h1>
      <p className="mt-3 pl-[0.55em] text-[clamp(0.8rem,2.2vw,1.15rem)] font-light tracking-[0.55em] uppercase">
        Thiago Ottoboni
      </p>
      <p className="mt-6 max-w-md text-sm text-pb-muted md:text-base">
        Tomada de decisão na estratificação, etapa por etapa. Responda e o protocolo do caso se monta sozinho.
      </p>
    </header>
  )
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const item =
    'rounded-full px-4 py-2 font-semibold transition-colors aria-pressed:bg-pb-text aria-pressed:text-pb-red text-pb-muted hover:text-pb-text aria-pressed:hover:text-pb-red'
  return (
    <div className="flex rounded-full border border-pb-line/60 p-1" role="group" aria-label="Modo de visualização">
      <button type="button" className={item} aria-pressed={mode === 'guiado'} onClick={() => onChange('guiado')}>
        Guiado
      </button>
      <button type="button" className={item} aria-pressed={mode === 'mapa'} onClick={() => onChange('mapa')}>
        Mapa completo
      </button>
    </div>
  )
}

/* ── Peças visuais ─────────────────────────────────────────────────────── */

function StagePill({ stage, size = 'md', muted = false }: { stage: Stage; size?: 'sm' | 'md' | 'lg'; muted?: boolean }) {
  const sizes = {
    sm: 'px-4 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-lg md:text-xl',
    lg: 'px-7 py-3 text-xl md:px-9 md:py-4 md:text-2xl',
  }
  return (
    <span
      className={`inline-flex items-baseline gap-1.5 rounded-full whitespace-nowrap uppercase shadow-[0_6px_24px_-8px_rgb(211_48_47/0.6)] ${sizes[size]} ${
        muted ? 'bg-transparent text-pb-muted shadow-none ring-1 ring-pb-line/60' : 'bg-pb-red text-white'
      }`}
    >
      <span className="font-light">{stage.number}.</span>
      <span className="font-extrabold tracking-[0.01em]">{stage.title}</span>
    </span>
  )
}

function AnswerPill({ value, state = 'idle', small = false }: { value: Answer; state?: 'idle' | 'chosen' | 'dim'; small?: boolean }) {
  const look = {
    idle: 'bg-white text-pb-red',
    chosen: 'bg-pb-red text-white ring-2 ring-white',
    dim: 'bg-white/90 text-pb-red opacity-40',
  }[state]
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-normal tracking-[0.02em] transition ${look} ${
        small ? 'h-8 min-w-16 px-3 text-sm' : 'h-14 min-w-[5.5rem] px-5 text-2xl md:h-16 md:min-w-[6.25rem] md:text-[1.75rem]'
      }`}
    >
      {answerLabel[value]}
    </span>
  )
}

/* ── Modo guiado ───────────────────────────────────────────────────────── */

function StageRail({ state }: { state: PlaybookState }) {
  return (
    <ol className="flex items-center justify-center gap-1 sm:gap-2" aria-label="Etapas">
      {stages.map((stage, i) => {
        const status = stageStatus(state, stage.id)
        return (
          <li key={stage.id} className="flex items-center gap-1 sm:gap-2" aria-current={status === 'current' ? 'step' : undefined}>
            {i > 0 ? <span className={`h-px w-2 sm:w-6 ${status === 'todo' ? 'bg-pb-line/40' : 'bg-pb-red'}`} aria-hidden /> : null}
            <span
              className={`inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs uppercase sm:h-9 sm:gap-1.5 sm:px-3 sm:text-sm transition-colors ${
                status === 'current'
                  ? 'bg-pb-red text-white'
                  : status === 'done'
                    ? 'bg-pb-red/20 text-pb-text ring-1 ring-pb-red'
                    : 'text-pb-muted ring-1 ring-pb-line/50'
              }`}
            >
              <span className="font-light">{status === 'done' ? '✓' : `${stage.number}.`}</span>
              <span className={`font-extrabold ${status === 'current' ? '' : 'hidden lg:inline'}`}>
                {stage.title}
              </span>
              <span className="sr-only">
                {status === 'done' ? ' — concluída' : status === 'current' ? ' — em andamento' : ' — pendente'}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function History({ state, onRevisit }: { state: PlaybookState; onRevisit: (i: number) => void }) {
  if (state.done === 0) return null
  return (
    <ol className="mb-10 space-y-3" aria-label="Respostas anteriores">
      {steps.slice(0, state.done).map((step, i) => {
        const value = step.kind === 'question' ? state.answers[step.id] : undefined
        const text =
          step.kind === 'question'
            ? value
              ? conduct(step, value)
              : ''
            : step.options
              ? state.effects.length
                ? `Efeitos: ${step.options.filter((o) => state.effects.includes(o)).join(', ')}`
                : 'Sem efeitos ópticos'
              : step.text
        return (
          <li
            key={step.id}
            className="flex flex-col gap-3 rounded-2xl border border-pb-line/30 bg-white/[0.025] px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="flex items-center gap-3 sm:w-32 sm:shrink-0">
              <span className="text-xs font-extrabold tracking-[0.12em] text-pb-red uppercase">
                {stageOf(step.stage).number}. {stageOf(step.stage).title}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              {step.kind === 'question' ? <p className="text-sm font-bold">{step.question}</p> : null}
              <p className={`text-sm ${value === 'nao' ? 'text-pb-muted' : 'text-pb-text/90'}`}>{text}</p>
            </div>
            <div className="flex items-center gap-3">
              {value ? <AnswerPill value={value} small /> : null}
              <button
                type="button"
                onClick={() => onRevisit(i)}
                className="text-xs text-pb-muted underline decoration-pb-line/60 underline-offset-4 hover:text-pb-text"
              >
                alterar
              </button>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

type CurrentProps = {
  index: number
  state: PlaybookState
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onAnswer: (i: number, a: Answer) => void
  onComplete: (i: number) => void
  onToggleEffect: (e: string) => void
}

function CurrentStep({ index, state, headingRef, onAnswer, onComplete, onToggleEffect }: CurrentProps) {
  const step = steps[index]!
  const stage = stageOf(step.stage)
  const isLast = index === steps.length - 1
  return (
    <div className="animate-rise">
      <StagePill stage={stage} size="lg" />
      {step.kind === 'question' ? (
        <>
          <h2 ref={headingRef} tabIndex={-1} className="mt-7 text-[clamp(1.6rem,4.4vw,2.6rem)] leading-[1.1] font-bold outline-none">
            {step.question}
          </h2>
          <div className="mt-8 grid gap-4">
            {(['sim', 'nao'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onAnswer(index, value)}
                className="group flex items-center gap-5 rounded-full border border-transparent p-1.5 pr-6 text-left transition hover:border-pb-line/50 hover:bg-white/[0.04] focus-visible:border-pb-line"
              >
                <AnswerPill value={value} />
                <span className={`text-base leading-snug md:text-lg ${value === 'sim' ? 'text-pb-text' : 'text-pb-muted'} group-hover:text-pb-text`}>
                  {value === 'sim' ? step.sim : step.nao}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-6 hidden text-xs text-pb-muted md:block">
            Atalhos: <kbd className="rounded border border-pb-line/50 px-1.5">S</kbd> sim ·{' '}
            <kbd className="rounded border border-pb-line/50 px-1.5">N</kbd> não
          </p>
        </>
      ) : (
        <InfoBody step={step} state={state} headingRef={headingRef} onToggleEffect={onToggleEffect}>
          <button
            type="button"
            onClick={() => onComplete(index)}
            className="mt-9 inline-flex h-14 items-center gap-3 rounded-full bg-pb-red px-8 text-lg font-extrabold tracking-[0.02em] text-white uppercase transition hover:bg-pb-red-strong"
          >
            {isLast ? 'Finalizar protocolo' : 'Concluir etapa'} <span aria-hidden>→</span>
          </button>
        </InfoBody>
      )}
    </div>
  )
}

function InfoBody({
  step,
  state,
  headingRef,
  onToggleEffect,
  children,
}: {
  step: InfoStep
  state: PlaybookState
  headingRef?: React.RefObject<HTMLHeadingElement | null>
  onToggleEffect: (e: string) => void
  children?: React.ReactNode
}) {
  return (
    <>
      <h2 ref={headingRef} tabIndex={-1} className="mt-7 text-[clamp(1.4rem,3.6vw,2.2rem)] leading-[1.15] font-light outline-none">
        {step.options ? (
          <>
            <strong className="font-bold">Efeitos ópticos.</strong> Marque os que serão utilizados:
          </>
        ) : (
          step.text
        )}
      </h2>
      {step.options ? (
        <div className="mt-6 flex flex-wrap gap-2.5" role="group" aria-label="Efeitos ópticos">
          {step.options.map((effect) => {
            const on = state.effects.includes(effect)
            return (
              <button
                key={effect}
                type="button"
                aria-pressed={on}
                onClick={() => onToggleEffect(effect)}
                className="h-11 rounded-full px-5 text-base ring-1 ring-pb-line/70 transition hover:ring-pb-text aria-pressed:bg-white aria-pressed:font-semibold aria-pressed:text-pb-red aria-pressed:ring-white"
              >
                {effect}
              </button>
            )
          })}
        </div>
      ) : null}
      {children}
    </>
  )
}

function Protocol({
  state,
  headingRef,
  onRestart,
  onMap,
}: {
  state: PlaybookState
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onRestart: () => void
  onMap: () => void
}) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(protocolText(state))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="animate-rise">
      <p className="text-xs font-extrabold tracking-[0.3em] text-pb-red uppercase">Protocolo do caso</p>
      <h2 ref={headingRef} tabIndex={-1} className="mt-3 text-[clamp(1.8rem,4.6vw,2.8rem)] leading-[1.05] font-bold outline-none">
        Sequência definida.
      </h2>
      <ol className="mt-8 space-y-6">
        {buildProtocol(state).map(({ stage, items }) => (
          <li key={stage.id} className="flex flex-col gap-3 sm:flex-row sm:gap-6">
            <div className="sm:w-48 sm:shrink-0">
              <StagePill stage={stage} size="sm" />
            </div>
            <ul className="space-y-1 pt-1">
              {items.map((item) => (
                <li key={item} className="text-base leading-snug md:text-lg">
                  {item}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <div className="mt-10 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-12 items-center rounded-full bg-pb-red px-6 font-extrabold tracking-[0.02em] text-white uppercase transition hover:bg-pb-red-strong"
        >
          <span aria-live="polite">{copied ? 'Copiado!' : 'Copiar protocolo'}</span>
        </button>
        <button
          type="button"
          onClick={onMap}
          className="inline-flex h-12 items-center rounded-full bg-white px-6 font-semibold text-pb-red transition hover:bg-white/85"
        >
          Ver no mapa
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-pb-text ring-1 ring-pb-line/70 transition hover:ring-pb-text"
        >
          Novo caso
        </button>
      </div>
    </div>
  )
}

/* ── Modo mapa ─────────────────────────────────────────────────────────── */

function FlowMap({
  state,
  onAnswer,
  onToggleEffect,
  onRestart,
}: {
  state: PlaybookState
  onAnswer: (i: number, a: Answer) => void
  onToggleEffect: (e: string) => void
  onRestart: () => void
}) {
  return (
    <div>
      <p className="mx-auto max-w-xl text-center text-sm text-pb-muted">
        O fluxo inteiro, como no material. Toque em SIM ou NÃO para marcar o caminho — as respostas são as mesmas do
        modo guiado.
      </p>
      <ol className="mt-10 space-y-2">
        {stages.map((stage, si) => {
          const stageSteps = steps.flatMap((s, i) => (s.stage === stage.id ? [{ step: s, index: i }] : []))
          return (
            <li key={stage.id}>
              {si > 0 ? <DownArrow /> : null}
              <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-start md:gap-10">
                <div className="md:pt-3">
                  <StagePill stage={stage} size="lg" muted={stageStatus(state, stage.id) === 'todo' && state.done > 0} />
                </div>
                <div className="space-y-8">
                  {stageSteps.map(({ step, index }) =>
                    step.kind === 'question' ? (
                      <MapQuestion key={step.id} step={step} index={index} value={state.answers[step.id]} onAnswer={onAnswer} />
                    ) : (
                      <div key={step.id} className="text-lg md:pt-4 md:text-xl">
                        {step.options ? (
                          <InfoBody step={step} state={state} onToggleEffect={onToggleEffect} />
                        ) : (
                          <p className="font-light">{step.text}</p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      <div className="mt-12 flex justify-center">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex h-12 items-center rounded-full px-6 font-semibold ring-1 ring-pb-line/70 transition hover:ring-pb-text"
        >
          Limpar respostas
        </button>
      </div>
    </div>
  )
}

function MapQuestion({
  step,
  index,
  value,
  onAnswer,
}: {
  step: QuestionStep
  index: number
  value: Answer | undefined
  onAnswer: (i: number, a: Answer) => void
}) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,15rem)_32px_1fr] md:items-center md:gap-4">
      <p className="text-lg leading-tight font-bold md:text-xl">{step.question}</p>
      <Fork />
      <div className="grid gap-3 border-l border-pb-line/60 pl-4 md:border-0 md:pl-0">
        {(['sim', 'nao'] as const).map((option) => {
          const look = value === undefined ? 'idle' : value === option ? 'chosen' : 'dim'
          return (
            <button
              key={option}
              type="button"
              aria-pressed={value === option}
              onClick={() => onAnswer(index, option)}
              className="group flex items-center gap-4 rounded-full p-1 pr-4 text-left transition hover:bg-white/[0.04]"
            >
              <AnswerPill value={option} state={look} />
              <span
                className={`text-base leading-snug transition md:text-lg ${
                  look === 'dim' ? 'text-pb-muted/60' : look === 'chosen' ? 'text-pb-text' : 'text-pb-text/85'
                }`}
              >
                {option === 'sim' ? step.sim : step.nao}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Bifurcação "<" com setas, como no material. */
function Fork() {
  return (
    <svg viewBox="0 0 32 96" className="hidden h-24 w-8 text-pb-line md:block" fill="none" aria-hidden>
      <path d="M3 48 L28 10 M3 48 L28 86" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 10 H28 V18 M20 86 H28 V78" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function DownArrow() {
  return (
    <svg viewBox="0 0 16 56" className="mx-auto my-4 h-14 w-4 text-pb-line md:ml-[100px]" fill="none" aria-hidden>
      <path d="M8 2 V52 M3 46 L8 52 L13 46" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
