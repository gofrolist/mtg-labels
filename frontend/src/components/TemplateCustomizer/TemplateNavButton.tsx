interface TemplateNavButtonProps {
  isOpen: boolean
  onToggle: () => void
  badgeLabel?: string
}

export function TemplateNavButton({ isOpen, onToggle, badgeLabel }: TemplateNavButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="h-9 px-3 py-0 flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors text-sm text-white font-medium cursor-pointer select-none"
      aria-expanded={isOpen}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
      <span className="pointer-events-none">Template</span>
      {badgeLabel && (
        <span className="bg-mtg-accent text-gray-900 text-xs px-2 py-0.5 rounded font-bold shrink-0 pointer-events-none">
          {badgeLabel}
        </span>
      )}
    </button>
  )
}
