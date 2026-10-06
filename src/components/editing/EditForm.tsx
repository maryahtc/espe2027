'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import type { FieldDef } from '@/config/editing'
import { removeRecordAction, saveRecordAction, type FormState } from '@/app/(portal)/coordenacao/actions'

type Option = { value: string; label: string }

const inputClass =
  'w-full rounded-md border border-rule-strong bg-surface px-3 text-[15px] text-ink placeholder:text-faint outline-none focus:border-ink aria-[invalid=true]:border-danger'

function normalize(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

function splitNames(value: string): string[] {
  return value
    .split(/\s*(?:[,;/+&\n]|\s+e\s+)\s*/i)
    .map((n) => n.trim())
    .filter(Boolean)
}

function ProfessorsField({ field, value, professors }: { field: FieldDef; value: string; professors: string[] }) {
  const current = splitNames(value)
  const known = new Map(professors.map((p) => [normalize(p), p]))
  const checked = new Set(current.filter((n) => known.has(normalize(n))).map((n) => known.get(normalize(n))!))
  const others = current.filter((n) => !known.has(normalize(n))).join('; ')
  return (
    <fieldset>
      <legend className="label mb-2">{field.label}</legend>
      <input type="hidden" name={`${field.key}__presente`} value="1" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {professors.map((name) => (
          <label key={name} className="flex min-h-10 items-center gap-2 text-[15px]">
            <input type="checkbox" name={field.key} value={name} defaultChecked={checked.has(name)} className="size-4 accent-[var(--ink)]" />
            {name}
          </label>
        ))}
      </div>
      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-sm text-muted">Outros nomes (separados por ponto e vírgula)</span>
        <input name={`${field.key}__outros`} defaultValue={others} className={`${inputClass} h-11`} />
      </label>
    </fieldset>
  )
}

function Field({
  field,
  value,
  error,
  modules,
  professors,
}: {
  field: FieldDef
  value: string
  error?: string
  modules: Option[]
  professors: string[]
}) {
  if (field.kind === 'professors') return <ProfessorsField field={field} value={value} professors={professors} />

  const id = `campo-${field.key}`
  const describedBy = error ? `${id}-erro` : field.help ? `${id}-ajuda` : undefined
  const common = {
    id,
    name: field.key,
    defaultValue: value,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  }

  let control
  if (field.kind === 'textarea') {
    control = <textarea {...common} rows={4} className={`${inputClass} py-2.5 leading-relaxed`} />
  } else if (field.kind === 'select' || field.kind === 'module' || field.kind === 'professor') {
    const options: Option[] =
      field.kind === 'module'
        ? modules
        : field.kind === 'professor'
          ? professors.map((p) => ({ value: p, label: p }))
          : (field.options ?? []).map((o) => ({ value: o, label: o }))
    const known = options.some((o) => o.value === value)
    control = (
      <select {...common} className={`${inputClass} h-11`} required={field.required}>
        <option value="">—</option>
        {value && !known ? <option value={value}>{value} (valor atual na planilha)</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  } else {
    const placeholder =
      field.kind === 'date' ? 'DD/MM/AAAA' : field.kind === 'time' ? 'HH:MM' : field.kind === 'month' ? 'ago/2027' : undefined
    const inputMode = field.kind === 'number' ? 'decimal' : field.kind === 'date' || field.kind === 'time' ? 'numeric' : undefined
    control = (
      <input
        {...common}
        type="text"
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete="off"
        required={field.required}
        className={`${inputClass} h-11 ${field.kind === 'date' || field.kind === 'time' || field.kind === 'number' ? 'data max-w-[12rem]' : ''}`}
      />
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label">
        {field.label}
        {field.required ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      {control}
      {error ? (
        <p id={`${id}-erro`} className="text-sm text-danger">
          {error}
        </p>
      ) : field.help ? (
        <p id={`${id}-ajuda`} className="text-sm text-muted">
          {field.help}
        </p>
      ) : null}
    </div>
  )
}

export function EditForm({
  entitySlug,
  singular,
  fields,
  values,
  refValue,
  version,
  modules,
  professors,
  archiveByStatus,
}: {
  entitySlug: string
  singular: string
  fields: FieldDef[]
  values: Record<string, string>
  refValue: string | null
  version: string
  modules: Option[]
  professors: string[]
  archiveByStatus: boolean
}) {
  const [state, save, saving] = useActionState<FormState, FormData>(saveRecordAction, null)
  const [removeState, remove, removing] = useActionState<FormState, FormData>(removeRecordAction, null)
  const [confirming, setConfirming] = useState(false)
  const message = state?.message ?? removeState?.message
  // Depois de um erro, o formulário é remontado com o que a pessoa digitou (nada se perde).
  const shown = state?.values ? { ...values, ...state.values } : values

  return (
    <div>
      {message ? (
        <div role="alert" className="mb-6 rounded-md border border-danger/40 bg-danger-bg px-4 py-3 text-sm text-danger">
          {message}
        </div>
      ) : null}

      <form key={state?.attempt ?? 'inicial'} action={save} className="grid gap-6">
        <input type="hidden" name="__entidade" value={entitySlug} />
        <input type="hidden" name="__ref" value={refValue ?? ''} />
        <input type="hidden" name="__versao" value={version} />
        {fields.map((field) => (
          <Field
            key={field.key}
            field={field}
            value={shown[field.key] ?? ''}
            error={state?.errors?.[field.key]}
            modules={modules}
            professors={professors}
          />
        ))}
        <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-6">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center rounded-md bg-ink px-6 text-sm font-semibold text-paper hover:bg-ink-2 disabled:opacity-60"
          >
            {saving ? 'Gravando na planilha…' : refValue ? 'Salvar alterações' : 'Criar na planilha'}
          </button>
          <Link href={`/coordenacao/${entitySlug}`} className="link-underline text-sm">
            Cancelar
          </Link>
        </div>
      </form>

      {refValue ? (
        <form action={remove} className="mt-10 rounded-lg border border-rule p-4">
          <input type="hidden" name="__entidade" value={entitySlug} />
          <input type="hidden" name="__ref" value={refValue} />
          <input type="hidden" name="__versao" value={version} />
          <p className="text-sm text-muted">
            {archiveByStatus
              ? 'Arquivar marca o Status como “Rascunho”: deixa de aparecer no portal, mas continua na planilha.'
              : 'Remover apaga a linha da planilha. Os dados ficam registrados na aba HISTÓRICO.'}
          </p>
          {confirming ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={removing}
                className="inline-flex min-h-11 items-center rounded-md bg-danger px-5 text-sm font-semibold text-paper disabled:opacity-60"
              >
                {removing ? 'Gravando…' : archiveByStatus ? 'Confirmar arquivamento' : 'Confirmar remoção'}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="link-underline text-sm">
                Voltar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="mt-3 min-h-11 text-sm font-medium text-danger">
              {archiveByStatus ? `Arquivar ${singular}` : `Remover ${singular}`}
            </button>
          )}
        </form>
      ) : null}
    </div>
  )
}
