import { EmptyState } from '@portal/ui/empty-state'
import { IconArrowRight, IconPlus } from '@portal/ui/icons'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { NavIcon } from '@/components/shell/NavIcon'
import { adminGroups } from '@/config/nav'
import { today } from '@/lib/academic/load'
import type { AttentionItem } from '@/lib/admin/attention'
import { loadAdminOverview } from '@/lib/admin/overview'
import { formatDayMonth, relativeDays, year } from '@/lib/dates'

export const metadata: Metadata = { title: 'Administração' }

/**
 * Etapa 10 · Parte 3 — painel inicial do Admin com números reais (lib/admin/overview) e "Precisa da sua atenção"
 * pelas regras aprovadas (lib/admin/attention). Só fatos de cadastro: nenhuma métrica de desempenho, ranking ou
 * leitura automática sobre a formação clínica dos alunos (essa fica em Produção da turma).
 */

const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`

type Shortcut = { slug: string; href: string; verb: string; noun: string; where: string; icon: 'layers' | 'users' | 'calendar' | 'book' | 'branch' | 'tooth' }

/** As seis coisas que mais se cadastra, na ordem em que a especialização é montada. */
const SHORTCUTS: Shortcut[] = [
  { slug: 'turmas', href: '/admin/turmas', verb: 'Nova', noun: 'turma', where: 'Turmas', icon: 'layers' },
  { slug: 'alunos', href: '/admin/alunos', verb: 'Convidar', noun: 'aluno', where: 'Alunos', icon: 'users' },
  { slug: 'modulos', href: '/admin/modulos/novo', verb: 'Novo', noun: 'módulo', where: 'Módulos e cronograma', icon: 'calendar' },
  { slug: 'conteudos', href: '/admin/conteudos', verb: 'Nova', noun: 'aula ou conteúdo', where: 'Biblioteca', icon: 'book' },
  { slug: 'workflows', href: '/admin/workflows/novo', verb: 'Novo', noun: 'workflow', where: 'Workflows clínicos', icon: 'branch' },
  { slug: 'procedimentos', href: '/admin/procedimentos', verb: 'Novo', noun: 'procedimento', where: 'Procedimentos', icon: 'tooth' },
]

function AttentionList({ items, tone }: { items: AttentionItem[]; tone: 'pendencia' | 'editorial' }) {
  return (
    <ul className="mt-3 divide-y divide-rule border-y border-rule" data-atencao-grupo={tone}>
      {items.map((a) => (
        <li key={`${a.kind}-${a.text}`}>
          <Link href={a.href} className="group flex items-center justify-between gap-4 py-3.5" data-atencao={a.kind} data-tom={a.tone}>
            <span className="min-w-0 text-[15px] leading-snug">
              {a.text}
              {a.when ? <span className="block text-xs text-muted">{a.when}</span> : null}
            </span>
            <IconArrowRight size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default async function AdminHome() {
  const o = await loadAdminOverview()
  if (!o) {
    return (
      <>
        <PageTitle eyebrow="Administração" title="O que você quer cadastrar?" />
        <EmptyState title="Painel indisponível">Os números aparecem quando o portal estiver conectado ao banco com uma conta de Admin.</EmptyState>
      </>
    )
  }
  const day = today()
  const status: Record<string, string> = {
    turmas: n(o.cohortsActive, 'turma ativa', 'turmas ativas'),
    alunos: `${n(o.studentsActive, 'aluno ativo', 'alunos ativos')} · ${n(o.invitesPending, 'convite pendente', 'convites pendentes')}`,
    modulos: `${n(o.modules.published, 'publicado', 'publicados')} · ${o.modules.draft} em rascunho`,
    conteudos: `${n(o.contents.published, 'publicado', 'publicados')} · ${o.contents.draft} em rascunho`,
    workflows: o.workflows ? `${n(o.workflows.published, 'publicado', 'publicados')} · ${o.workflows.draft} em rascunho` : 'Disponível após a atualização do banco',
    procedimentos: n(o.proceduresActive, 'procedimento ativo', 'procedimentos ativos'),
  }
  const pend = o.attention.filter((a) => a.tone === 'pendencia')
  const edit = o.attention.filter((a) => a.tone === 'editorial')

  return (
    <div data-painel-admin>
      <PageTitle eyebrow="Administração" title="O que você quer cadastrar?" />

      {/* As seis ações principais, com a situação real de cada cadastro. */}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-atalhos>
        {SHORTCUTS.map((s) => (
          <li key={s.slug}>
            <Link href={s.href} className="group glass flex h-full gap-4 rounded-2xl p-5 transition-colors hover:border-rule-strong" data-atalho={s.slug}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-sunken text-ink">
                <NavIcon name={s.icon} size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-lg leading-tight font-semibold">
                  <IconPlus size={16} className="text-signal" />
                  {s.verb} {s.noun}
                </span>
                <span className="mt-1 block text-xs text-muted">em {s.where}</span>
                <span className="num mt-3 block border-t border-rule pt-3 text-xs text-ink-2" data-situacao>
                  {status[s.slug]}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        <section aria-labelledby="atencao" className="lg:col-span-7" data-atencao-secao>
          <span className="num block text-sm font-semibold text-signal">01</span>
          <h2 id="atencao" className="text-2xl font-light tracking-tight">
            Precisa da sua atenção
          </h2>
          <div className="rule-brand mt-2 w-12" />
          {o.attention.length ? (
            <div className="mt-5 space-y-7">
              {pend.length ? (
                <div>
                  <p className="text-sm font-semibold">Pendências</p>
                  <p className="text-xs text-muted">Cadastro incompleto que afeta o que o aluno vê.</p>
                  <AttentionList items={pend} tone="pendencia" />
                </div>
              ) : null}
              {edit.length ? (
                <div>
                  <p className="text-sm font-semibold">Lembretes editoriais</p>
                  <p className="text-xs text-muted">Cadastros em andamento. Não são erros.</p>
                  <AttentionList items={edit} tone="editorial" />
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-rule px-4 py-3 text-sm text-muted" data-atencao-vazia>
              Nada pendente agora.
            </p>
          )}
        </section>

        <section aria-labelledby="agora" className="lg:col-span-5">
          <span className="num block text-sm font-semibold text-signal">02</span>
          <h2 id="agora" className="text-2xl font-light tracking-tight">
            Agora
          </h2>
          <div className="rule-brand mt-2 w-12" />
          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-rule bg-rule" data-numeros-admin>
            {(
              [
                ['alunos', 'alunos ativos', o.studentsActive],
                ['convites', 'convites pendentes', o.invitesPending],
                ['conteudos', 'conteúdos publicados', o.contents.published],
                ['workflows', 'workflows publicados', o.workflows?.published ?? null],
                ['procedimentos', 'procedimentos ativos', o.proceduresActive],
                ['avisos', 'avisos no ar', o.announcementsLive],
              ] as const
            )
              .filter(([, , v]) => v !== null)
              .map(([key, label, value]) => (
                <div key={key} className="bg-surface p-4" data-numero={key}>
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="num mt-1 text-3xl leading-none font-light" data-valor>
                    {value}
                  </dd>
                </div>
              ))}
          </dl>
          {o.nextModule ? (
            <p className="mt-4 text-sm text-ink-2" data-proximo-modulo>
              Próximo:{' '}
              <Link href={`/admin/modulos/${o.nextModule.id}`} className="font-semibold hover:underline">
                Módulo {o.nextModule.label} · {o.nextModule.title}
              </Link>
              , {formatDayMonth(o.nextModule.start)}/{year(o.nextModule.start)} ({relativeDays(day, o.nextModule.start)})
              {o.cohortsActive > 1 && o.nextModule.cohortName ? <span className="text-muted"> · {o.nextModule.cohortName}</span> : null}
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted" data-proximo-modulo="nenhum">
              Nenhum módulo publicado com data futura.
            </p>
          )}
          <Link href="/admin/producao" className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            Produção da turma <IconArrowRight size={14} />
          </Link>
        </section>
      </div>

      <section aria-labelledby="mapa" className="mt-14 border-t border-rule pt-8">
        <h2 id="mapa" className="eyebrow">
          Todas as áreas do painel
        </h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {adminGroups.map((g) => (
            <div key={g.label}>
              <p className="text-sm font-semibold">{g.label}</p>
              <ul className="mt-2 space-y-1.5">
                {g.sections.map((s) => (
                  <li key={s.slug}>
                    <Link href={`/admin/${s.slug}`} className="text-sm text-muted hover:text-ink hover:underline">
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
