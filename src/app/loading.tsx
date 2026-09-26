export default function Loading() {
  return (
    <div className="animate-pulse py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="h-10 w-2/3 rounded bg-rule" />
      <div className="mt-4 h-4 w-1/2 rounded bg-rule" />
      <div className="mt-10 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-rule/60" />
        ))}
      </div>
    </div>
  )
}
