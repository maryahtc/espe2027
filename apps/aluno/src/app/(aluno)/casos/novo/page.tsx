import { Button } from '@portal/ui/button'
import { Field } from '@portal/ui/field'
import { PageTitle } from '@portal/ui/section'
import type { Metadata } from 'next'
import Link from 'next/link'
import { DEMO_TODAY, nextModule } from '@/demo/data'

export const metadata: Metadata = { title: 'Registrar caso' }

const RECENT = ['Laminado cerâmico', 'Resina posterior', 'Resina anterior', 'Onlay', 'Clareamento', 'Coroa']
const TOPICS = ['Preparo', 'Término cervical', 'Isolamento', 'Cimentação', 'Seleção de cor', 'Ajuste oclusal']

// Alternância entre os dois modos sem JavaScript (rádio + :has()).
const modeCss = `
[data-novo]:has(#modo-lista:checked) [data-modo="texto"]{display:none}
[data-novo]:has(#modo-texto:checked) [data-modo="lista"]{display:none}`

const chip =
  'inline-flex min-h-10 cursor-pointer items-center rounded-full border border-rule-strong px-3.5 text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-ink'

export default function NewCasePage() {
  return (
    <div data-novo className="max-w-3xl">
      <style>{modeCss}</style>
      <Link href="/casos" className="text-sm text-muted hover:text-ink">
        ← Meus casos
      </Link>
      <PageTitle eyebrow="Clínica" title="Registrar caso" lead="Paciente, data e o que você fez. O resto pode ser completado depois." />

      <form className="space-y-10">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Paciente" name="paciente" placeholder="Iniciais ou código" hint="Nunca o nome completo." defaultValue="C.M.R." />
          <Field label="Data do atendimento" name="data" type="date" defaultValue={DEMO_TODAY} />
        </div>

        <fieldset>
          <legend className="text-sm font-semibold">O que você fez?</legend>
          <div className="mt-2 inline-flex rounded-md border border-rule-strong p-0.5 text-sm">
            <span>
              <input type="radio" name="modo" id="modo-lista" defaultChecked className="peer sr-only" />
              <label htmlFor="modo-lista" className="block cursor-pointer rounded-[5px] px-3 py-1.5 text-muted peer-checked:bg-ink peer-checked:font-semibold peer-checked:text-white">
                Escolher na lista
              </label>
            </span>
            <span>
              <input type="radio" name="modo" id="modo-texto" className="peer sr-only" />
              <label htmlFor="modo-texto" className="block cursor-pointer rounded-[5px] px-3 py-1.5 text-muted peer-checked:bg-ink peer-checked:font-semibold peer-checked:text-white">
                Descrever o que fiz
              </label>
            </span>
          </div>

          <div data-modo="lista" className="mt-5 space-y-5">
            <div>
              <p className="eyebrow">Seus mais registrados</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {RECENT.map((p, i) => (
                  <span key={p}>
                    <input type="radio" name="procedimento" id={`proc-${i}`} defaultChecked={i === 3} className="peer sr-only" />
                    <label htmlFor={`proc-${i}`} className={chip}>
                      {p}
                    </label>
                  </span>
                ))}
                <span className="inline-flex min-h-10 items-center rounded-full border border-dashed border-rule-strong px-3.5 text-sm text-muted">
                  Buscar outro…
                </span>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-[10rem_1fr]">
              <Field label="Quantidade" name="qtd" type="number" min={1} defaultValue={2} hint="Em peças" />
              <Field label="Dentes" name="dentes" placeholder="Ex.: 36, 37" defaultValue="36, 37" hint="Opcional" />
            </div>
          </div>

          <div data-modo="texto" className="mt-5 space-y-4">
            <div>
              <label htmlFor="descricao" className="block text-sm font-semibold">
                Descreva com suas palavras
              </label>
              <textarea
                id="descricao"
                rows={3}
                defaultValue="Preparo e cimentação de dois onlays nos dentes 36 e 37."
                className="mt-1.5 block w-full rounded-md border border-rule-strong bg-surface px-3 py-2.5 text-base focus:border-ink focus:outline-none"
              />
              <p className="mt-1 text-xs text-muted">Não escreva o nome do paciente. O texto original fica guardado no caso.</p>
            </div>
            <div className="rounded-lg border border-ink bg-surface p-5">
              <p className="eyebrow">Sugestão · confira antes de salvar</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                {[
                  ['Categoria', 'Restauração indireta'],
                  ['Procedimento', 'Onlay'],
                  ['Quantidade', '2 peças'],
                  ['Dentes', '36 e 37'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-muted">Temas sugeridos: Preparo · Cimentação</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button">Está certo</Button>
                <Button type="button" variant="secondary">
                  Corrigir
                </Button>
              </div>
            </div>
          </div>
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="modulo" className="block text-sm font-semibold">
              Módulo relacionado
            </label>
            <select id="modulo" defaultValue="14" className="mt-1.5 block min-h-11 w-full rounded-md border border-rule-strong bg-surface px-3 text-base">
              <option value="14">Módulo {nextModule.slug} · {nextModule.title}</option>
              <option value="15">Módulo 15 · Onlays e overlays</option>
            </select>
          </div>
          <Field label="Link do Smile Cloud" name="smile" type="url" placeholder="Cole o link do caso" hint="Opcional" />
        </div>

        <div className="space-y-6 border-t border-rule pt-8">
          <div>
            <label htmlFor="dificuldade" className="block text-sm font-semibold">
              Qual foi sua maior dificuldade neste caso?
            </label>
            <textarea id="dificuldade" rows={2} className="mt-1.5 block w-full rounded-md border border-rule-strong bg-surface px-3 py-2.5 text-base focus:border-ink focus:outline-none" />
            <div className="mt-3">
              <p className="text-xs text-muted">Tem a ver com algum destes temas?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TOPICS.map((t, i) => (
                  <span key={t}>
                    <input type="checkbox" id={`tema-${i}`} className="peer sr-only" />
                    <label htmlFor={`tema-${i}`} className={chip}>
                      {t}
                    </label>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="facilidade" className="block text-sm font-semibold">
              Qual foi sua maior facilidade?
            </label>
            <textarea id="facilidade" rows={2} className="mt-1.5 block w-full rounded-md border border-rule-strong bg-surface px-3 py-2.5 text-base focus:border-ink focus:outline-none" />
          </div>
          <div>
            <label htmlFor="diferente" className="block text-sm font-semibold">
              Tem algo que você faria diferente? <span className="font-normal text-muted">(opcional)</span>
            </label>
            <textarea id="diferente" rows={2} className="mt-1.5 block w-full rounded-md border border-rule-strong bg-surface px-3 py-2.5 text-base focus:border-ink focus:outline-none" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-6">
          <Button type="button" className="min-h-12 px-6">
            Salvar caso
          </Button>
          <Link href="/casos" className="text-sm text-muted hover:text-ink">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
