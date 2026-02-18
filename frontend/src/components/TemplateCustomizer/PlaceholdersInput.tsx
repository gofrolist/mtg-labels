import { getTemplate, getDefaultTemplate } from '../../constants/templates'
import type { CustomTemplateDimensions } from '../../types'

interface PlaceholdersInputProps {
  templateId: string
  placeholders: number
  onPlaceholdersChange: (value: number) => void
  customTemplate?: CustomTemplateDimensions | null
  useCustomTemplate?: boolean
}

export function PlaceholdersInput({
  templateId,
  placeholders,
  onPlaceholdersChange,
  customTemplate,
  useCustomTemplate,
}: PlaceholdersInputProps) {
  const maxPlaceholders =
    useCustomTemplate && customTemplate
      ? customTemplate.columns * customTemplate.rows - 1
      : (getTemplate(templateId) || getDefaultTemplate()).labels_per_page - 1

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value >= 0 && value <= maxPlaceholders) {
      onPlaceholdersChange(value)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="placeholders-input" className="text-sm text-mtg-text whitespace-nowrap">
        Empty at start:
      </label>
      <input
        id="placeholders-input"
        type="number"
        min="0"
        max={maxPlaceholders}
        value={placeholders}
        onChange={handleChange}
        className="w-16 px-2 py-1 border border-mtg-border rounded bg-mtg-card-bg text-mtg-text focus:outline-none focus:ring-2 focus:ring-mtg-accent text-sm"
        aria-label={`Number of empty labels at start (0 to ${maxPlaceholders})`}
      />
    </div>
  )
}
