import { memo, ReactNode, useState } from 'react'

interface AccordionGroupProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  onSelectGroup?: () => void
  isGroupSelected?: boolean
  children: ReactNode
}

export const AccordionGroup = memo(function AccordionGroup({
  title,
  isOpen,
  onToggle,
  onSelectGroup,
  isGroupSelected,
  children,
}: AccordionGroupProps) {
  const [hasBeenOpened, setHasBeenOpened] = useState(isOpen)
  if (isOpen && !hasBeenOpened) setHasBeenOpened(true)
  const headingId = `heading-${title}`
  const collapseId = `collapse-${title}`

  return (
    <div className="accordion-item border border-mtg-border rounded-lg overflow-hidden">
      {/* Heading row: toggle button + Select Group */}
      <div id={headingId} className="flex justify-between items-center w-full bg-mtg-section-bg">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center min-w-0 flex-1 pl-4 pr-2 py-2 bg-transparent border-0 cursor-pointer text-mtg-text focus:outline-none focus-visible:ring-2 focus-visible:ring-mtg-accent focus-visible:ring-inset"
          aria-expanded={isOpen}
          aria-controls={collapseId}
        >
          <span className="font-medium truncate">{title}</span>
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
            className={`mx-2 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        {onSelectGroup && (
          <button
            type="button"
            onClick={onSelectGroup}
            className="h-9 mr-2 px-3 py-0 flex items-center text-sm border border-mtg-border rounded-lg hover:bg-mtg-hover-bg transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-mtg-accent"
          >
            {isGroupSelected ? 'Deselect Group' : 'Select Group'}
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
            {hasBeenOpened ? children : null}
          </div>
        </div>
      </div>
    </div>
  )
})
