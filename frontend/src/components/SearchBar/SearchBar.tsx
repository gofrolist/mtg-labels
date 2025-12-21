import { memo } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
}

export const SearchBar = memo(function SearchBar({ value, onChange, onClear }: SearchBarProps) {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search sets..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 sm:px-4 py-2 pl-9 sm:pl-10 pr-9 sm:pr-10 border border-mtg-border rounded-lg bg-mtg-card-bg text-mtg-text placeholder-mtg-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base min-h-[44px]"
        aria-label="Search sets"
      />
      <span className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-mtg-text-muted text-sm sm:text-base">
        🔍
      </span>
      {value && (
        <button
          onClick={onClear}
          className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-mtg-text-muted hover:text-mtg-text min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  )
})
