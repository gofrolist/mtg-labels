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
  // Full dimensions in points (72 pts = 1 inch)
  page_width: number
  page_height: number
  label_width: number
  label_height: number
  label_margin_x: number
  label_margin_y: number
  left_margin: number
  top_margin: number
  horizontal_gap: number
  vertical_gap: number
}

// Template measurement units
export type TemplateMeasurementUnit = 'in' | 'mm' | 'cm'

// Custom template dimensions (values stored in the selected unit)
export interface CustomTemplateDimensions {
  pageWidth: number
  pageHeight: number
  unit: TemplateMeasurementUnit
  marginLeft: number
  marginTop: number
  columns: number
  rows: number
  horizontalGap: number
  verticalGap: number
  labelWidth: number
  labelHeight: number
}

// Saved custom template
export interface SavedCustomTemplate {
  id: string
  name: string
  template: CustomTemplateDimensions
}

// Alphabet divider labels
export type AlphabetMode = 'off' | 'all' | 'custom'

export interface AlphabetSelection {
  mode: AlphabetMode
  // Raw text the user typed in Custom mode, e.g. "A-F, H, L-Z".
  customInput: string
}

// Selection State
export interface SelectionState {
  selectedSetIds: string[]
  quantities: Record<string, number> // Map of set ID to quantity (1-100)
  templateId: string | null
  placeholders: number // Number of empty labels at start (0 to labels_per_page - 1)
  customTemplate: CustomTemplateDimensions | null
  useCustomTemplate: boolean
  useCustomQuantity: boolean // When false, all sets use quantity 1
  alphabet?: AlphabetSelection // Alphabet divider labels (off by default); optional until the consumer is wired up
}

// Theme Preference
export type ThemePreference = 'light' | 'dark'

// User-configurable set filter preferences (persisted to localStorage)
export interface SetFilterPreferences {
  activeSetTypes: string[]
  ignoredSetCodes: string[]
  minimumSetSize: number
}
