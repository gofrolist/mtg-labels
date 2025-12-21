import { memo } from 'react'
import type { MTGSet } from '../../types'

interface SetItemProps {
  set: MTGSet
  isSelected: boolean
  quantity: number
  onToggle: () => void
  onQuantityChange: (quantity: number) => void
}

export const SetItem = memo(function SetItem({ set, isSelected, quantity, onToggle, onQuantityChange }: SetItemProps) {
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value >= 1 && value <= 100) {
      onQuantityChange(value)
    }
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 py-2 border-b border-mtg-border last:border-b-0">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="w-5 h-5 min-w-[20px] min-h-[20px] text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
        aria-label={`Select ${set.name}`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {set.icon_svg_uri && (
            <img
              src={set.icon_svg_uri}
              alt={`${set.name} icon`}
              className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
              aria-hidden="true"
            />
          )}
          <span className="font-medium text-mtg-text truncate text-sm sm:text-base" title={set.name}>
            {set.name}
          </span>
          <span className="text-xs sm:text-sm text-mtg-text-muted">({set.code})</span>
        </div>
        <div className="text-xs text-mtg-text-muted mt-0.5 sm:mt-1">
          {set.card_count} cards
        </div>
      </div>
      {isSelected && (
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <label htmlFor={`quantity-${set.id}`} className="text-xs sm:text-sm text-mtg-text-muted hidden sm:inline">
            Qty:
          </label>
          <input
            id={`quantity-${set.id}`}
            type="number"
            min="1"
            max="100"
            value={quantity}
            onChange={handleQuantityChange}
            className="w-14 sm:w-16 px-1 sm:px-2 py-1 text-xs sm:text-sm border border-mtg-border rounded bg-mtg-card-bg text-mtg-text"
          />
        </div>
      )}
    </div>
  )
})
