// Re-export API types from generated models
export type { MTGSetResponse as MTGSet } from '../api/model'

// Card Type type definition
export interface CardType {
  color: string
  type: string
  id: string // Format: "color:type"
}

// Label Template configuration
export interface LabelTemplate {
  id: string
  name: string
  dimensions: string
  labels_per_page: number
  labels_per_row: number
  label_rows: number
}

// Selection State
export interface SelectionState {
  selectedSetIds: string[]
  selectedCardTypeIds: string[]
  quantities: Record<string, number> // Map of item ID to quantity (1-100)
  templateId: string
  placeholders: number // Number of empty labels at start (0 to labels_per_page - 1)
  viewMode: 'sets' | 'types'
}

// Theme Preference
export type ThemePreference = 'light' | 'dark'

// Card Types by Color (API response format)
export type CardTypesByColor = Record<string, string[]>
