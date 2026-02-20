interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  variant?: 'default' | 'nav'
  className?: string
}

export function SearchBar({ value, onChange, onClear, variant = 'default', className }: SearchBarProps) {
  const isNav = variant === 'nav'
  return (
    <div className={`flex items-center ${className ?? ''}`}>
      <span
        className={
          isNav
            ? 'h-9 flex items-center justify-center px-2 bg-white/10 border border-white/20 rounded-l text-gray-300 shrink-0'
            : 'px-2 py-2 bg-mtg-input-bg border border-mtg-border rounded-l text-mtg-text-muted'
        }
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </span>
      <input
        type="text"
        placeholder="Search sets..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          isNav
            ? 'h-9 px-3 border border-white/20 border-l-0 rounded-r bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm min-w-0 box-border w-40 flex-1'
            : 'px-3 py-2 border border-mtg-border border-l-0 rounded-r bg-mtg-input-bg text-mtg-text placeholder-mtg-text-muted focus:outline-none focus:ring-2 focus:ring-mtg-accent text-sm'
        }
        aria-label="Search sets"
      />
      {value && (
        <button
          onClick={onClear}
          className={
            isNav
              ? 'h-9 min-w-9 ml-2 px-2 py-0 flex items-center justify-center text-gray-400 hover:text-white transition-colors'
              : 'h-9 min-w-9 ml-2 px-2 py-0 flex items-center justify-center text-mtg-text-muted hover:text-mtg-text transition-colors'
          }
          aria-label="Clear search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      )}
    </div>
  )
}
