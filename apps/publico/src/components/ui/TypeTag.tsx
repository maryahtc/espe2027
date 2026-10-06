import { CLASS_TYPES, type ClassType } from '@/config/vocab'

export function TypeTag({ type }: { type: ClassType | null }) {
  if (!type) return null
  return (
    <span className="inline-flex items-center rounded-sm border border-rule-strong px-1.5 py-px text-[10.5px] font-semibold tracking-[0.1em] text-ink-2 uppercase">
      {CLASS_TYPES[type].label}
    </span>
  )
}
