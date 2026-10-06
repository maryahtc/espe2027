import { Activate } from '@/components/Enhancer'
import { CloseIcon, SearchIcon } from '@/components/ui/icons'

/**
 * Campo de busca (HTML puro, ativado no navegador).
 *  - mode "navigate": envia para /busca?q=… (Home)
 *  - mode "search":   busca ao digitar, na própria página /busca
 *  - mode "filter":   é o filtro de texto de uma lista (ex.: professores)
 */
export function SearchBox({
  id,
  placeholder,
  label,
  mode,
  param = 'q',
  size = 'md',
}: {
  id: string
  placeholder: string
  label: string
  mode: 'navigate' | 'search' | 'filter'
  param?: string
  size?: 'md' | 'lg'
}) {
  const large = size === 'lg'
  const input = (
    <div className="relative" data-clearable="">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
        width={large ? 22 : 18}
        height={large ? 22 : 18}
      />
      <input
        id={id}
        name={param}
        type="search"
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        {...(mode === 'search' ? { 'data-search-input': '' } : {})}
        {...(mode === 'filter' ? { 'data-filter-control': param } : {})}
        className={`w-full rounded-lg border border-rule-strong bg-surface text-ink placeholder:text-faint transition-[border-color,box-shadow] outline-none focus:border-ink focus:shadow-[0_0_0_3px_rgba(22,22,26,0.08)] [&::-webkit-search-cancel-button]:hidden ${
          large ? 'h-16 pr-14 pl-13 text-[17px] md:text-xl' : 'h-12 pr-12 pl-11 text-base'
        }`}
      />
      <button
        type="button"
        data-clear-input=""
        hidden
        className="absolute top-1/2 right-2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-ink"
        aria-label="Limpar busca"
      >
        <CloseIcon width={16} height={16} />
      </button>
    </div>
  )
  if (mode === 'filter') return input
  return (
    <form action="/busca" method="get" role="search" data-enhance="">
      {input}
      {mode === 'navigate' ? <Activate /> : null}
    </form>
  )
}
