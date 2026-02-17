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
    <div className="border border-mtg-border rounded mb-2">
      {/* Heading row with accordion button and Select Group button */}
      <div className="flex justify-between items-center w-full px-2 py-2">
        {/* Accordion header */}
        <h2 className="mb-0 flex-grow-1">
          <button
            onClick={onToggle}
            className={`w-full text-left px-3 py-2 rounded transition-colors bg-mtg-card-bg hover:opacity-80`}
            aria-expanded={isOpen}
          >
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
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors min-w-[140px] ml-2"
          >
            Select Group
          </button>
        )}
      </div>

      {/* Collapsible content */}
      {isOpen && (
        <div className="px-4 py-2 bg-mtg-card-bg">
          {children}
        </div>
      )}
    </div>
  )
})
