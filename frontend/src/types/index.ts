// Re-export API types from generated models
export type { MTGSetResponse as MTGSet } from '../api/model'

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
  quantities: Record<string, number> // Map of set ID to quantity (1-100)
  templateId: string
  placeholders: number // Number of empty labels at start (0 to labels_per_page - 1)
}

// Theme Preference
export type ThemePreference = 'light' | 'dark'
