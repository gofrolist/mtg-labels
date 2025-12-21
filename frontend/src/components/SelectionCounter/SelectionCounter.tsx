import { memo } from 'react'

interface SelectionCounterProps {
  selectedCount: number
  totalLabels: number
  totalPages: number
}

export const SelectionCounter = memo(function SelectionCounter({ selectedCount, totalLabels, totalPages }: SelectionCounterProps) {
  return (
    <div className="px-4 py-2 bg-mtg-card-bg border border-mtg-border rounded-lg">
      <div className="flex items-center justify-between text-sm">
        <span className="text-mtg-text">
          <strong>{selectedCount}</strong> selected
        </span>
        <span className="text-mtg-text-muted">
          {totalLabels} labels • {totalPages} pages
        </span>
      </div>
    </div>
  )
})
