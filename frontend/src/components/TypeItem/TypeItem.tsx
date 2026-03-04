import { memo } from 'react'

interface TypeItemProps {
  typeId: string // "color:type" format
  typeName: string
  isSelected: boolean
  quantity: number
  showQuantityInput: boolean
  onToggle: () => void
  onQuantityChange: (quantity: number) => void
}

export const TypeItem = memo(function TypeItem({
  typeId,
  typeName,
  isSelected,
  quantity,
  showQuantityInput,
  onToggle,
  onQuantityChange,
}: TypeItemProps) {
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
        id={`type-${typeId}`}
        checked={isSelected}
        onChange={onToggle}
        className="w-4 h-4 mr-2 accent-mtg-accent rounded focus:ring-2 focus:ring-mtg-accent cursor-pointer flex-shrink-0"
      />
      <label
        className="flex items-center cursor-pointer flex-1 min-w-0"
        htmlFor={`type-${typeId}`}
        title={typeName}
      >
        <span className="truncate text-base">{typeName}</span>
      </label>
      {showQuantityInput && (
        <input
          type="number"
          inputMode="numeric"
          min="1"
          max="100"
          value={quantity}
          onChange={handleQuantityChange}
          onClick={(e) => e.stopPropagation()}
          className="w-12 ml-auto px-1 py-0.5 text-xs border border-mtg-border rounded bg-mtg-card-bg text-mtg-text flex-shrink-0"
          aria-label={`Quantity for ${typeName}`}
        />
      )}
    </div>
  )
})
