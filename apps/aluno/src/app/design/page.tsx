import { Button, ButtonLink } from '@portal/ui/button'
import { cn } from '@portal/ui/cn'
import { EmptyState } from '@portal/ui/empty-state'
import { Field } from '@portal/ui/field'
import { IconArrowRight, IconBook, IconBranch, IconCalendar, IconHome, IconPlus, IconTooth } from '@portal/ui/icons'
import { ModuleRuler } from '@portal/ui/module-ruler'
import { PageTitle, SectionHeader } from '@portal/ui/section'
import { Chip, RequirementTag, StatusPill } from '@portal/ui/tag'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CaseCover } from '@/components/cases/CaseCover'
import { Poster } from '@/components/library/Poster'
import { Logo } from '@/components/shell/Logo'
import { PreviewBanner } from '@/components/shell/PreviewBanner'
import { cases } from '@/demo/cases'
import { modules } from '@/demo/data'
import { library } from '@/demo/library'

export const metadata: Metadata = { title: 'Design system' }

const COLORS = [
  { name: 'Fundo', token: '--paper', hex: '#090909', use: 'Fundo de todas as telas' },
  { name: 'Superfície', token: '--surface', hex: '#121212', use: 'Leitura, formulários, tabelas (opaca)' },
  { name: 'Realce', token: '--sunken', hex: '#181818', use: 'Realce dentro de superfície' },
  { name: 'Hover', token: '--raised', hex: '#1D1D1D', use: 'Fundo ao passar o mouse' },
  { name: 'Texto', token: '--ink', hex: '#F3F3F1', use: 'Texto principal · 17,9:1' },
  { name: 'Texto forte 2', token: '--ink-2', hex: '#CFCFCB', use: 'Corpo de texto · 12,7:1' },
  { name: 'Secundário', token: '--muted', hex: '#9D9D98', use: 'Metadados · 7,3:1' },
  { name: 'Rótulos', token: '--faint', hex: '#85857F', use: 'Rótulos pequenos, ícones · 5,4:1' },
  { name: 'Vermelho Conexo', token: '--brand', hex: '#CA2C2C', use: 'Preenchimento: ação primária, progresso, ponto ativo' },
  { name: 'Vermelho texto', token: '--signal', hex: '#F0625E', use: 'Texto/ícone vermelho sobre escuro · 6,3:1' },
  { name: 'Atenção/erro', token: '--danger', hex: '#F2A07B', use: 'Erros de formulário, sempre com ícone + texto' },
]

const SURFACES = [
  { name: 'Superfície opaca', cls: 'bg-surface border border-rule', use: 'Leitura longa, formulário, tabela' },
  { name: '.glass', cls: 'glass', use: 'Cards principais, casos, nós, painéis' },
  { name: '.glass .glass-sheen', cls: 'glass glass-sheen', use: 'Superfície dominante (próximo módulo)' },
  { name: '.glass-strong', cls: 'glass glass-strong', use: 'Navegação, barras fixas, diálogos' },
  { name: '.is-selected', cls: 'glass is-selected', use: 'Selecionado / etapa atual / próximo' },
]

function Swatch({ hex }: { hex: string }) {
  return <span className="block h-16 rounded-xl ring-1 ring-white/10" style={{ background: hex }} />
}

function Group({ index, title, note, children }: { index: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <SectionHeader index={index} title={title} />
      {note ? <p className="-mt-2 max-w-2xl text-sm text-muted">{note}</p> : null}
      {children}
    </section>
  )
}

export default function DesignPage() {
  return (
    <>
      <PreviewBanner />
      <main className="mx-auto max-w-[1180px] px-4 py-10 sm:px-8">
        <Logo />
        <PageTitle
          eyebrow="Design system · Conexo / Dark Glass"
          title="Preto, branco, cinza. Vermelho como assinatura."
          lead="Tokens e componentes do pacote @portal/ui. Vidro só onde cria hierarquia; leitura e formulários ficam opacos. Contrastes medidos sobre o fundo #090909."
        />

        <div className="space-y-20">
          <Group index="01" title="Cores">
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {COLORS.map((c) => (
                <li key={c.token} className="space-y-2.5">
                  <Swatch hex={c.hex} />
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="num text-xs text-muted">
                    {c.hex} · {c.token}
                  </p>
                  <p className="text-xs leading-relaxed text-ink-2">{c.use}</p>
                </li>
              ))}
            </ul>
          </Group>

          <Group index="02" title="Superfícies e vidro" note="Translucidez com blur de 22 px, borda branca a 9% e reflexo de 1 px no topo. Com 'reduzir transparência' ativo no sistema, vira superfície opaca.">
            <div className="relative overflow-hidden rounded-[28px] p-6 sm:p-10" style={{ background: 'radial-gradient(500px 300px at 20% 10%, rgba(202,44,44,0.25), transparent 60%), radial-gradient(400px 300px at 90% 90%, rgba(255,255,255,0.08), transparent 60%), #0a0a0a' }}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {SURFACES.map((s) => (
                  <div key={s.name} className={cn('min-h-36 rounded-2xl p-4', s.cls)}>
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="mt-1 text-xs text-muted">{s.use}</p>
                  </div>
                ))}
              </div>
            </div>
          </Group>

          <Group index="03" title="Tipografia" note="Contraste de escala, poucos pesos. Raleway para texto; Outfit (no lugar da Gilroy) para números.">
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="space-y-5 lg:col-span-7">
                <p className="eyebrow">Rótulo · 11 px · caixa alta</p>
                <p className="text-[3.6rem] leading-[1.02] font-light tracking-tight">Laminados cerâmicos</p>
                <p className="text-2xl font-light tracking-tight">Título de seção · 24 px leve</p>
                <p className="text-[15px] font-semibold">Título de item · 15 px</p>
                <p className="max-w-[58ch] text-[15px] leading-relaxed text-ink-2">
                  Corpo de texto em Raleway 15 px, entrelinha 1,6. Antes de decidir, observe o substrato, a cor e o espaço disponível.
                </p>
                <p className="text-xs text-muted">Legenda · 12 px · cinza secundário</p>
              </div>
              <div className="lg:col-span-5">
                <p className="num text-[168px] leading-[0.8] font-extralight tracking-[-0.06em]">14</p>
                <p className="num mt-6 text-2xl">16–18 mar 2028 · 08:30</p>
                <p className="num mt-2 text-6xl font-extralight">5 <span className="font-sans text-sm text-muted">dias</span></p>
              </div>
            </div>
          </Group>

          <Group index="04" title="Botões e estados">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <p className="eyebrow">Variantes</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button>
                    <IconPlus size={18} /> Primária
                  </Button>
                  <Button variant="secondary">Secundária</Button>
                  <ButtonLink href="/design" variant="quiet">
                    Discreta <IconArrowRight size={15} />
                  </ButtonLink>
                </div>
                <p className="text-xs text-muted">Uma primária (vermelha) por área. As demais em vidro ou texto.</p>
              </div>
              <div className="space-y-4">
                <p className="eyebrow">Estados</p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="glass inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold">Default</span>
                  <span className="glass inline-flex min-h-11 items-center rounded-full border-rule-strong bg-[rgba(30,30,30,0.66)] px-5 text-sm font-semibold">Hover</span>
                  <span className="glass is-selected inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold">Selected</span>
                  <span className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-on-ink">Ativo (filtro)</span>
                  <Button disabled>Disabled</Button>
                  <span className="inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold outline-2 outline-offset-2 outline-ink">Foco</span>
                </div>
              </div>
            </div>
          </Group>

          <Group index="05" title="Campos" note="Sempre opacos: legibilidade acima do efeito.">
            <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
              <Field label="Paciente" name="ds-paciente" placeholder="Iniciais ou código" hint="Nunca o nome completo." />
              <Field label="Data" name="ds-data" defaultValue="11/03/2028" />
              <Field label="Com erro" name="ds-erro" error="Informe a data do atendimento" />
              <Field label="Desabilitado" name="ds-off" disabled defaultValue="Turma 2027" />
            </div>
          </Group>

          <Group index="06" title="Etiquetas e status" note="Forma e texto, não cor: o estado continua legível em escala de cinza.">
            <div className="flex flex-wrap items-center gap-6">
              <StatusPill status="rascunho" />
              <StatusPill status="publicado" />
              <StatusPill status="arquivado" />
              <RequirementTag level="obrigatorio" />
              <RequirementTag level="recomendado" />
              <RequirementTag level="complementar" />
              <Chip>Término cervical</Chip>
              <span className="inline-flex items-center gap-2 text-sm">
                <span className="glow-dot" /> Ativo / você está aqui
              </span>
            </div>
          </Group>

          <Group index="07" title="Navegação">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="glass glass-strong rounded-2xl p-3">
                {[
                  ['Início', IconHome, true],
                  ['Especialização', IconCalendar, false],
                  ['Aprender', IconBook, false],
                  ['Pensar', IconBranch, false],
                  ['Clínica', IconTooth, false],
                ].map(([l, I, on]) => {
                  const Icon = I as typeof IconHome
                  return (
                    <span
                      key={l as string}
                      className={cn('relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px]', on ? 'bg-white/[0.06] font-semibold' : 'text-muted')}
                    >
                      {on ? <span className="absolute top-1/2 -left-3 h-5 w-[3px] -translate-y-1/2 rounded-r bg-brand" /> : null}
                      <Icon /> {l as string}
                    </span>
                  )
                })}
              </div>
              <div className="flex items-end justify-center rounded-2xl bg-[#0b0b0b] p-6 ring-1 ring-white/5">
                <ul className="glass glass-strong grid w-full max-w-sm grid-cols-5 rounded-[22px] px-1">
                  {[
                    ['Início', IconHome, true],
                    ['Especial.', IconCalendar, false],
                    ['Aprender', IconBook, false],
                    ['Pensar', IconBranch, false],
                    ['Clínica', IconTooth, false],
                  ].map(([l, I, on]) => {
                    const Icon = I as typeof IconHome
                    return (
                      <li key={l as string} className={cn('relative flex h-16 flex-col items-center justify-center gap-1 text-[10.5px]', on ? 'font-semibold' : 'text-faint')}>
                        <Icon size={22} />
                        {l as string}
                        {on ? <span className="glow-dot absolute bottom-1.5 !size-1" /> : null}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </Group>

          <Group index="08" title="Painel contextual e diálogo">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="glass rounded-[22px] p-6">
                <p className="eyebrow">Antes de decidir, considere</p>
                <ul className="mt-4 space-y-3 text-[15px]">
                  {['intensidade do escurecimento', 'espessura disponível', 'necessidade de mascaramento'].map((t) => (
                    <li key={t} className="flex gap-3">
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass glass-strong glass-sheen rounded-[24px] border p-6">
                <p className="eyebrow flex items-center gap-2 text-signal">
                  <span className="glow-dot !size-1.5" /> Confirmar alteração
                </p>
                <p className="mt-3 text-2xl font-light">Publicar alterações no Módulo 15?</p>
                <p className="mt-3 text-sm text-ink-2">O cronograma de 18 alunos muda.</p>
                <div className="mt-6 flex justify-end gap-3">
                  <Button variant="secondary">Cancelar</Button>
                  <Button>Publicar alterações</Button>
                </div>
              </div>
            </div>
          </Group>

          <Group index="09" title="Card de caso e card de conteúdo">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cases.slice(0, 1).map((c) => (
                <Link key={c.id} href={`/casos/${c.id}`} className="glass glass-interactive group overflow-hidden rounded-[22px]">
                  <span className="relative block">
                    <CaseCover item={c} className="aspect-[16/10]" />
                    <span className="num absolute bottom-4 left-5 text-4xl font-light text-white">{c.patient}</span>
                  </span>
                  <span className="block p-5">
                    <span className="block text-lg font-semibold">{c.procedure}</span>
                    <span className="num block text-sm text-muted">{c.teeth.split(', ').join(' · ')}</span>
                  </span>
                </Link>
              ))}
              {library.slice(0, 2).map((l) => (
                <Link key={l.slug} href={`/biblioteca/${l.slug}`} className="group block">
                  <Poster item={l} />
                  <span className="mt-3 block text-[15px] font-semibold group-hover:underline">{l.title}</span>
                  <span className="block text-sm text-muted">
                    {l.teacher} · <span className="num">{l.minutes} min</span>
                  </span>
                </Link>
              ))}
            </div>
          </Group>

          <Group index="10" title="Nós de workflow" note="Caminho percorrido em vermelho; respostas possíveis em cinza; etapa atual com contorno vermelho e ponto de luz.">
            <div className="max-w-xl">
              <div className="glass flex items-center gap-4 rounded-2xl px-4 py-3">
                <span className="flex size-7 items-center justify-center rounded-full border border-[rgba(202,44,44,0.6)] bg-brand-tint">
                  <span className="size-1.5 rounded-full bg-brand" />
                </span>
                <span className="text-sm text-ink-2">Qual é a principal alteração?</span>
              </div>
              <div className="relative ml-[22px] flex h-10 items-center pl-6">
                <span className="absolute inset-y-0 left-0 w-[2px] -translate-x-1/2 bg-brand shadow-[0_0_10px_var(--brand-glow)]" />
                <span className="text-xs font-semibold text-signal">→ Cor</span>
              </div>
              <div className="glass is-selected rounded-[22px] p-6">
                <p className="eyebrow flex items-center gap-2">
                  <span className="glow-dot" /> 02 Pergunta
                </p>
                <p className="mt-3 text-2xl font-light">O substrato apresenta escurecimento significativo?</p>
              </div>
              <div className="ml-[22px] h-6 w-[2px] -translate-x-1/2 bg-white/10" />
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
                {['Sim', 'Não'].map((o) => (
                  <span key={o} className="glass flex min-h-14 items-center gap-3 rounded-2xl px-5 text-[15px] font-semibold">
                    <span className="size-2 rounded-full border border-white/30" /> {o}
                  </span>
                ))}
              </div>
            </div>
          </Group>

          <Group index="11" title="Calendário e régua">
            <div className="grid max-w-xl grid-cols-7 gap-1.5">
              {[13, 14, 15, 16, 17, 18, 19].map((d) => {
                const mod = d >= 16 && d <= 18
                return (
                  <span
                    key={d}
                    className={cn(
                      'min-h-20 rounded-2xl p-2',
                      mod ? 'glass is-selected' : 'bg-white/[0.02] ring-1 ring-white/[0.05]',
                    )}
                  >
                    <span className={cn('num inline-flex size-7 items-center justify-center rounded-full text-sm', d === 14 ? 'bg-ink text-on-ink' : mod ? 'text-ink' : 'text-muted')}>
                      {d}
                    </span>
                    {d === 16 ? <span className="mt-1 block text-[10px] font-semibold text-signal">MÓD. 14</span> : null}
                  </span>
                )
              })}
            </div>
            <ModuleRuler modules={modules.map((m) => ({ number: m.number, label: m.title, state: m.state, href: `/modulos/${m.slug}` }))} />
          </Group>

          <Group index="12" title="Estado vazio">
            <EmptyState title="Nenhum caso registrado ainda">Registre o primeiro atendimento: leva menos de um minuto.</EmptyState>
          </Group>
        </div>
      </main>
    </>
  )
}
