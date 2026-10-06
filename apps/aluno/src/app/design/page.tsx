import { Button, ButtonLink } from '@portal/ui/button'
import { EmptyState } from '@portal/ui/empty-state'
import { Field } from '@portal/ui/field'
import { IconArrowRight, IconPlus } from '@portal/ui/icons'
import { ModuleRuler } from '@portal/ui/module-ruler'
import { PageTitle, SectionHeader } from '@portal/ui/section'
import { Chip, RequirementTag } from '@portal/ui/tag'
import type { Metadata } from 'next'
import { Logo } from '@/components/shell/Logo'
import { PreviewBanner } from '@/components/shell/PreviewBanner'
import { modules } from '@/demo/data'

export const metadata: Metadata = { title: 'Design system' }

const COLORS = [
  { name: 'Vermelho Conexo', token: '--brand', hex: '#CA2C2C', use: 'Destaque pontual: ativo, próximo, filetes, numeração' },
  { name: 'Preto Conexo', token: '--ink', hex: '#141414', use: 'Texto, títulos, botão principal' },
  { name: 'Grafite', token: '--ink-2', hex: '#2E2D2D', use: 'Texto secundário forte' },
  { name: 'Cinza texto', token: '--muted', hex: '#5E5C5A', use: 'Metadados, legendas' },
  { name: 'Filete', token: '--rule', hex: '#E8E5E1', use: 'Bordas e divisões' },
  { name: 'Papel', token: '--paper', hex: '#FBFAF8', use: 'Fundo das páginas' },
  { name: 'Superfície', token: '--surface', hex: '#FFFFFF', use: 'Cartões e painéis' },
  { name: 'Erro', token: '--danger', hex: '#8E2A1F', use: 'Só erros de formulário, sempre com ícone e texto' },
]

export default function DesignPage() {
  return (
    <>
      <PreviewBanner />
      <main className="mx-auto max-w-[1120px] px-4 py-10 sm:px-8">
        <Logo />
        <PageTitle
          eyebrow="Design system"
          title="Conexo · Portal do Aluno"
          lead="Tokens e componentes compartilhados pelos portais (pacote @portal/ui). Fonte: manual ID Conexo — cores (03) e tipografia (04)."
        />

        <div className="space-y-16">
          <section className="space-y-6">
            <SectionHeader index="01" title="Cores" />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {COLORS.map((c) => (
                <li key={c.token} className="overflow-hidden rounded-md border border-rule bg-surface">
                  <span className="block h-20 border-b border-rule" style={{ background: c.hex }} />
                  <span className="block p-3 text-sm">
                    <span className="block font-semibold">{c.name}</span>
                    <span className="num block text-xs text-muted">
                      {c.hex} · {c.token}
                    </span>
                    <span className="mt-1 block text-xs text-ink-2">{c.use}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-6">
            <SectionHeader index="02" title="Tipografia" />
            <div className="grid gap-8 md:grid-cols-2">
              <div className="rounded-md border border-rule bg-surface p-6">
                <p className="eyebrow">Raleway — texto e títulos</p>
                <p className="mt-4 text-5xl font-light tracking-tight">Laminados cerâmicos</p>
                <p className="mt-3 text-2xl font-light">Título de seção</p>
                <p className="mt-3 text-[15px] font-semibold">Título de item</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                  Texto corrido em Raleway regular. Antes de decidir, observe o substrato, a cor e o espaço disponível.
                </p>
              </div>
              <div className="rounded-md border border-rule bg-surface p-6">
                <p className="eyebrow">Outfit — números (no lugar da Gilroy)</p>
                <p className="num mt-4 text-7xl font-light">14</p>
                <p className="num mt-2 text-2xl">16–18 mar 2028 · 08:30</p>
                <p className="num mt-2 text-lg text-muted">0123456789</p>
                <p className="mt-4 text-xs text-muted">
                  Raleway sem ajuste: <span className="[font-feature-settings:'onum'_1]">0123456789</span> (algarismos desalinhados) — por isso
                  números usam a fonte de números.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeader index="03" title="Ações" />
            <div className="flex flex-wrap items-center gap-4">
              <Button>
                <IconPlus size={18} /> Registrar caso
              </Button>
              <Button variant="secondary">Preparação · 2 pendentes</Button>
              <ButtonLink href="/design" variant="quiet">
                Ver cronograma completo <IconArrowRight size={15} />
              </ButtonLink>
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeader index="04" title="Etiquetas" />
            <p className="text-sm text-muted">Obrigatoriedade por forma, não por cor.</p>
            <div className="flex flex-wrap gap-6">
              <RequirementTag level="obrigatorio" />
              <RequirementTag level="recomendado" />
              <RequirementTag level="complementar" />
              <Chip>Término cervical</Chip>
              <Chip>Hands-on</Chip>
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeader index="05" title="Régua da especialização" />
            <ModuleRuler
              modules={modules.map((m) => ({ number: m.number, label: m.title, state: m.state, href: `/modulos/${m.slug}` }))}
            />
          </section>

          <section className="space-y-6">
            <SectionHeader index="06" title="Formulário" />
            <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
              <Field label="Paciente" name="paciente" placeholder="Iniciais ou código" hint="Nunca o nome completo." />
              <Field label="Data" name="data" error="Informe a data do atendimento" />
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeader index="07" title="Estado vazio" />
            <EmptyState stage="Etapa 4" title="Biblioteca">
              Explica o que vai existir na área e qual o próximo passo.
            </EmptyState>
          </section>
        </div>
      </main>
    </>
  )
}
