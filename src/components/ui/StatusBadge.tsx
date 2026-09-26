import { AVAILABILITY_STATUS, INVENTORY_STATUS, type StatusTone } from '@/config/vocab'

const TONE: Record<StatusTone, string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  muted: 'text-muted',
}

export function StatusDot({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap ${TONE[tone]}`}>
      <span className="size-[7px] rounded-full bg-current" aria-hidden />
      {label}
    </span>
  )
}

export function AvailabilityBadge({ status }: { status: keyof typeof AVAILABILITY_STATUS }) {
  const def = AVAILABILITY_STATUS[status]
  return <StatusDot tone={def.tone} label={def.label} />
}

export function InventoryBadge({ status }: { status: keyof typeof INVENTORY_STATUS }) {
  const def = INVENTORY_STATUS[status]
  return <StatusDot tone={def.tone} label={def.label} />
}

/** Selo discreto para itens ainda não confirmados. */
export function PendingTag({ children = 'A confirmar' }: { children?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-rule-strong px-2 py-0.5 text-[11px] font-medium tracking-wide text-muted">
      {children}
    </span>
  )
}
