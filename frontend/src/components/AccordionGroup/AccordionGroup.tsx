import { memo, ReactNode } from 'react'

interface AccordionGroupProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  onSelectGroup?: () => void
  children: ReactNode
}

export const AccordionGroup = memo(function AccordionGroup({ title, isOpen, onToggle, onSelectGroup, children }: AccordionGroupProps) {
  return (
    <div className="border border-mtg-border rounded-lg mb-2 overflow-hidden">
      {/* Heading row with accordion button and Select Group button */}
      <div className="flex justify-between items-center w-full px-2 py-2 bg-mtg-section-bg">
        {/* Accordion header */}
        <h2 className="mb-0 flex-grow-1">
          <button
            onClick={onToggle}
            className="w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 hover:bg-mtg-hover-bg font-medium"
            aria-expanded={isOpen}
          >
            <span className={`inline-block transition-transform mr-2 text-xs ${isOpen ? 'rotate-90' : ''}`}>&#9654;</span>
            {title}
          </button>
        </h2>

        {/* Select Group button */}
        {onSelectGroup && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelectGroup()
            }}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors min-w-[140px] ml-2"
          >
            Select Group
          </button>
        )}
      </div>

      {/* Collapsible content */}
      {isOpen && (
        <div className="px-4 py-2 bg-mtg-card-bg border-t border-mtg-border">
          {children}
        </div>
      )}
    </div>
  )
})
