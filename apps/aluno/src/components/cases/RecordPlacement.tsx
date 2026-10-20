'use client'

import { useState } from 'react'
import { ArchPicker, Odontogram } from '@/components/cases/Odontogram'
import { sortTeeth } from '@/lib/cases/model'
import { archQuantity, type CountUnit, type DentalArch, type StepLocation, UNIT_LABEL } from '@/lib/procedures/model'

/**
 * Edição de um registro: posições FDI (odontograma), arcada e quantidade — mesmas regras do registro rápido.
 * Envia `dentes`, `arcada` e `quantidade` no formulário (o servidor e o banco conferem de novo).
 */
export function RecordPlacement({
  location,
  unit,
  teeth: initialTeeth,
  arch: initialArch,
  quantity: initialQuantity,
  archSupported,
  inputCls,
}: {
  location: StepLocation
  unit: CountUnit
  teeth: number[]
  arch: DentalArch | null
  quantity: number
  archSupported: boolean
  inputCls: string
}) {
  const [teeth, setTeeth] = useState(initialTeeth)
  const [arch, setArch] = useState<DentalArch | null>(initialArch)
  const [quantity, setQuantity] = useState(initialQuantity)
  const [open, setOpen] = useState(false)
  const byTeeth = location === 'dentes' && teeth.length > 0
  const byArch = location === 'arcada' && archSupported
  const qty = byTeeth ? teeth.length : byArch && arch ? archQuantity(arch) : quantity
  const unitLabel = (n: number) => (n === 1 ? UNIT_LABEL[unit].one : UNIT_LABEL[unit].many)
  return (
    <div className="space-y-3 sm:col-span-2" data-edicao-posicoes>
      <input type="hidden" name="dentes" value={location === 'dentes' ? teeth.join(' ') : ''} />
      <input type="hidden" name="arcada" value={byArch ? (arch ?? '') : ''} />
      {location === 'dentes' ? (
        <div className="space-y-2">
          <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="num">{teeth.length ? `Posições: ${sortTeeth(teeth).join(' ')}` : 'Sem posições marcadas (opcional)'}</span>
            <button type="button" className="text-sm font-semibold underline-offset-4 hover:underline" onClick={() => setOpen(!open)} aria-expanded={open}>
              {open ? 'Fechar odontograma' : teeth.length ? 'Alterar posições' : 'Marcar no odontograma'}
            </button>
          </p>
          {open ? <Odontogram value={teeth} onChange={setTeeth} /> : null}
        </div>
      ) : null}
      {byArch ? (
        <div className="space-y-1.5">
          <p className="text-sm font-semibold">Arcada</p>
          <ArchPicker name="arcada-edicao" value={arch} onChange={setArch} />
        </div>
      ) : null}
      {unit === 'caso' ? (
        <input type="hidden" name="quantidade" value={1} />
      ) : byTeeth || byArch ? (
        <p className="text-sm">
          <input type="hidden" name="quantidade" value={qty} />
          <span className="text-muted">Quantidade: </span>
          <span className="num font-semibold">{byArch && !arch ? '—' : qty}</span> {byArch && !arch ? '(escolha a arcada)' : unitLabel(qty)}
        </p>
      ) : (
        <label className="block max-w-[12rem] text-sm font-semibold">
          Quantidade ({UNIT_LABEL[unit].many})
          <input type="number" name="quantidade" min={1} max={99} value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 1)} required className={inputCls} />
        </label>
      )}
    </div>
  )
}
