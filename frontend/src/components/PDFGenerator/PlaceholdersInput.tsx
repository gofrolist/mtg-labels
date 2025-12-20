import { memo } from 'react'
import { LABEL_TEMPLATES } from '../../constants/templates'

interface PlaceholdersInputProps {
  templateId: string
  placeholders: number
  onPlaceholdersChange: (value: number) => void
}

export const PlaceholdersInput = memo(function PlaceholdersInput({
  templateId,
  placeholders,
  onPlaceholdersChange,
}: PlaceholdersInputProps) {
  const template = LABEL_TEMPLATES[templateId] || LABEL_TEMPLATES.avery5160
  const maxPlaceholders = template.labels_per_page - 1

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value >= 0 && value <= maxPlaceholders) {
      onPlaceholdersChange(value)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="placeholders-input" className="text-sm font-medium text-mtg-text">
        Empty Labels at Start (0-{maxPlaceholders}):
      </label>
      <input
        id="placeholders-input"
        type="number"
        min="0"
        max={maxPlaceholders}
        value={placeholders}
        onChange={handleChange}
        className="px-4 py-2 border border-mtg-border rounded-lg bg-mtg-card-bg text-mtg-text focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Number of empty labels at start (0 to ${maxPlaceholders})`}
      />
      <p className="text-xs text-mtg-text-muted">
        Leave empty labels at the beginning of the first page
      </p>
    </div>
  )
})
