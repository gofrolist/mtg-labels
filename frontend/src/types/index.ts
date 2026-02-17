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

// Selection State
export interface SelectionState {
  selectedSetIds: string[]
  quantities: Record<string, number> // Map of set ID to quantity (1-100)
  templateId: string
  placeholders: number // Number of empty labels at start (0 to labels_per_page - 1)
  customTemplate: CustomTemplateDimensions | null
  useCustomTemplate: boolean
}

// Theme Preference
export type ThemePreference = 'light' | 'dark'
