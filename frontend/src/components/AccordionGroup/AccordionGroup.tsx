import { memo, ReactNode } from 'react'

interface AccordionGroupProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}

export const AccordionGroup = memo(function AccordionGroup({ title, isOpen, onToggle, children }: AccordionGroupProps) {
  return (
    <div className="border border-mtg-border rounded-lg mb-2">
      <button
        onClick={onToggle}
        className="w-full px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between bg-mtg-card-bg hover:bg-opacity-80 transition-colors min-h-[44px] touch-manipulation"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-mtg-text text-sm sm:text-base">{title}</span>
        <span className="text-mtg-text-muted text-sm sm:text-base">
          {isOpen ? '▼' : '▶'}
        </span>
      </button>
      {isOpen && (
        <div className="px-2 sm:px-4 py-2 bg-mtg-bg">
          {children}
        </div>
      )}
    </div>
  )
})
