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
    <div className="flex items-center hover:bg-mtg-hover-bg rounded px-1 py-0.5 transition-colors">
      <input
        type="checkbox"
        id={`set-${set.id}`}
        name="set_ids"
        value={set.id}
        checked={isSelected}
        onChange={onToggle}
        className="w-4 h-4 mr-2 accent-mtg-accent rounded focus:ring-2 focus:ring-mtg-accent cursor-pointer flex-shrink-0"
      />
      <label
        className="flex items-center cursor-pointer flex-1 min-w-0 truncate max-w-[280px]"
        htmlFor={`set-${set.id}`}
        title={set.name}
      >
        {set.icon_svg_uri && (
          <img
            src={set.icon_svg_uri}
            alt="symbol"
            className="w-5 h-5 mr-1 flex-shrink-0"
          />
        )}
        <span className="truncate text-sm">
          {set.name}
        </span>
      </label>
      {isSelected && (
        <input
          type="number"
          min="1"
          max="100"
          value={quantity}
          onChange={handleQuantityChange}
          className="w-12 ml-2 px-1 py-0.5 text-xs border border-mtg-border rounded bg-mtg-card-bg text-mtg-text flex-shrink-0"
          aria-label={`Quantity for ${set.name}`}
        />
      )}
    </div>
  )
})
