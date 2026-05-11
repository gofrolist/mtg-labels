interface SetFilterNavButtonProps {
  isOpen: boolean
  onToggle: () => void
  modified: boolean
}

export function SetFilterNavButton({ isOpen, onToggle, modified }: SetFilterNavButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="h-9 px-3 py-0 flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors text-sm text-white font-medium cursor-pointer select-none"
      aria-expanded={isOpen}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`shrink-0 pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        aria-hidden="true"
      >
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
      </svg>
      <span className="pointer-events-none">Filters</span>
      {modified && (
        <span className="bg-mtg-accent text-gray-900 text-xs px-2 py-0.5 rounded font-bold shrink-0 pointer-events-none">
          custom
        </span>
      )}
    </button>
  )
}
