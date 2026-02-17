interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
}

export function SearchBar({ value, onChange, onClear }: SearchBarProps) {
  return (
    <div className="flex items-center">
      <span className="px-2 py-2 bg-gray-700 border border-gray-600 rounded-l text-gray-300">
        🔍
      </span>
      <input
        type="text"
        placeholder="Search sets..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-600 border-l-0 rounded-r bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        aria-label="Search sets"
      />
      {value && (
        <button
          onClick={onClear}
          className="ml-2 px-2 py-2 text-gray-400 hover:text-white"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  )
}
