import { memo, ReactNode } from 'react'

interface AccordionGroupProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  onSelectGroup?: () => void
  children: ReactNode
}

export const AccordionGroup = memo(function AccordionGroup({ title, isOpen, onToggle, onSelectGroup, children }: AccordionGroupProps) {
  const headingId = `heading-${title}`
  const collapseId = `collapse-${title}`

  return (
    <div className="accordion-item border border-mtg-border rounded-lg overflow-hidden">
      {/* Heading row: title + Select Group */}
      <div
        id={headingId}
        className="flex justify-between items-center w-full pl-4 pr-2 py-2 bg-mtg-section-bg cursor-pointer"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls={collapseId}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <div className="flex items-center min-w-0 flex-1">
          <span className="font-medium truncate">{title}</span>
        </div>

        <span className={`inline-block transition-transform duration-200 mx-2 text-xs shrink-0 ${isOpen ? 'rotate-90' : ''}`}>&#9654;</span>

        {onSelectGroup && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelectGroup()
            }}
            className="h-9 px-3 py-0 flex items-center text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors min-w-[100px] shrink-0"
          >
            Select Group
          </button>
        )}
      </div>

      {/* Collapsible content — same grid animation as TemplateCustomizer */}
      <div
        id={collapseId}
        className="grid transition-[grid-template-rows] duration-200 ease-out overflow-hidden"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
        aria-hidden={!isOpen}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-4 py-2 bg-mtg-card-bg border-t border-mtg-border">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
})
