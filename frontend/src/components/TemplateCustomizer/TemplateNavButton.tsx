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
      <span
        className={`inline-block transition-transform duration-200 text-xs shrink-0 pointer-events-none ${isOpen ? 'rotate-90' : ''}`}
      >
        ▶
      </span>
      <span className="pointer-events-none">Template</span>
      {badgeLabel && (
        <span className="bg-mtg-accent text-gray-900 text-xs px-2 py-0.5 rounded font-bold shrink-0 pointer-events-none">
          {badgeLabel}
        </span>
      )}
    </button>
  )
}
