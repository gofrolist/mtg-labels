/**
 * Label Layout Configuration Types
 *
 * Allows users to customize how elements are positioned and styled within labels.
 */

// Position presets for elements within the label (3x3 grid)
export type LabelElementPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

// Available font families (supported by ReportLab)
export type LabelFontFamily =
  | 'Helvetica'
  | 'Helvetica-Bold'
  | 'Times-Roman'
  | 'Times-Bold'
  | 'Courier'
  | 'Courier-Bold'
  | 'EBGaramondBold'
  | 'SourceSansProRegular'

// Configuration for a text element
export interface TextElementConfig {
  visible: boolean
  position: LabelElementPosition
  fontFamily: LabelFontFamily
  fontSize: number // in points (pt)
}

// Configuration for the icon element
export interface IconElementConfig {
  visible: boolean
  position: LabelElementPosition
  size: number // as percentage of label height (10-100)
}

// Complete label layout definition
export interface LabelLayout {
  id: string
  name: string
  isDefault?: boolean // true for built-in layouts

  // Element configurations
  setIcon: IconElementConfig
  setName: TextElementConfig
  setCode: TextElementConfig
  releaseDate: TextElementConfig

  // Padding from label edge in points
  padding: number
}

// Saved custom layout (matches pattern from SavedCustomTemplate)
export interface SavedCustomLayout {
  id: string
  name: string
  layout: Omit<LabelLayout, 'id' | 'name' | 'isDefault'>
}

// Position preset options for UI dropdowns
export const POSITION_OPTIONS: { value: LabelElementPosition; label: string }[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'middle-left', label: 'Middle Left' },
  { value: 'middle-center', label: 'Middle Center' },
  { value: 'middle-right', label: 'Middle Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right', label: 'Bottom Right' },
]

// Font family options for UI dropdowns
export const FONT_OPTIONS: { value: LabelFontFamily; label: string }[] = [
  { value: 'EBGaramondBold', label: 'EB Garamond Bold' },
  { value: 'SourceSansProRegular', label: 'Source Sans Pro' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Helvetica-Bold', label: 'Helvetica Bold' },
  { value: 'Times-Roman', label: 'Times Roman' },
  { value: 'Times-Bold', label: 'Times Bold' },
  { value: 'Courier', label: 'Courier' },
  { value: 'Courier-Bold', label: 'Courier Bold' },
]
