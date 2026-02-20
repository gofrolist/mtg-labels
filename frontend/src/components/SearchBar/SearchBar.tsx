interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  variant?: 'default' | 'nav'
  className?: string
}

export function SearchBar({ value, onChange, onClear, variant = 'default', className }: SearchBarProps) {
  const isNav = variant === 'nav'
  const hasValue = value.length > 0

  return (
    <div
      className={`relative flex items-center ${className ?? ''}`}
    >
      {/* Search icon -- visible when empty, fades when typing */}
      <span
        className={`absolute left-2.5 pointer-events-none transition-opacity duration-150 ${
          hasValue ? 'opacity-0' : 'opacity-100'
        } ${isNav ? 'text-gray-400' : 'text-mtg-text-muted'}`}
        aria-hidden="true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </span>

      <input
        type="text"
        placeholder="Search sets..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-9 ${hasValue ? 'pl-3' : 'pl-9'} rounded text-sm focus:outline-none focus:ring-2 ${
          isNav
            ? 'pr-9 border border-white/20 bg-white/10 text-white placeholder-gray-400 focus:ring-white/50'
            : 'pr-9 border border-mtg-border bg-mtg-input-bg text-mtg-text placeholder-mtg-text-muted focus:ring-mtg-accent'
        }`}
        aria-label="Search sets"
      />

      {/* Clear button -- visible only when there is text */}
      {hasValue && (
        <button
          onClick={onClear}
          className={`absolute right-1.5 flex items-center justify-center w-6 h-6 rounded transition-colors ${
            isNav
              ? 'text-gray-400 hover:text-white'
              : 'text-mtg-text-muted hover:text-mtg-text hover:bg-mtg-hover-bg'
          }`}
          aria-label="Clear search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      )}
    </div>
  )
}
