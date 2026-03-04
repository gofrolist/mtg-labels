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
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'bg-mtg-accent/10 border border-mtg-accent'
          : 'bg-mtg-card-bg border border-mtg-border hover:bg-mtg-hover-bg'
      }`}
      aria-pressed={isSelected}
      aria-label={`${typeName} - ${isSelected ? 'selected' : 'not selected'}`}
    >
      <div
        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
          isSelected ? 'bg-mtg-accent text-white' : 'border-2 border-mtg-border'
        }`}
      >
        {isSelected && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      <span className="text-sm text-mtg-text truncate flex-1">{typeName}</span>

      {showQuantityInput && isSelected && (
        <input
          type="number"
          min={1}
          max={100}
          value={quantity}
          onChange={handleQuantityChange}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="w-14 px-2 py-1 text-sm border border-mtg-border rounded bg-mtg-input-bg text-mtg-text focus:outline-none focus:ring-2 focus:ring-mtg-accent"
          aria-label={`Quantity for ${typeName}`}
        />
      )}
    </div>
  )
})
