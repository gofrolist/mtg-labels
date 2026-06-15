import type { CustomTemplateDimensions, TemplateMeasurementUnit } from '../types'

const POINTS_PER_INCH = 72
const POINTS_PER_MM = 2.834645669
const POINTS_PER_CM = 28.34645669

function getPointsFactor(unit: TemplateMeasurementUnit): number {
  switch (unit) {
    case 'in':
      return POINTS_PER_INCH
    case 'mm':
      return POINTS_PER_MM
    case 'cm':
      return POINTS_PER_CM
  }
}

export function toPoints(value: number, unit: TemplateMeasurementUnit): number {
  return value * getPointsFactor(unit)
}

export function fromPoints(value: number, unit: TemplateMeasurementUnit): number {
  return value / getPointsFactor(unit)
}

export function convertValue(
  value: number,
  fromUnit: TemplateMeasurementUnit,
  toUnit: TemplateMeasurementUnit
): number {
  if (fromUnit === toUnit) return value
  const pts = toPoints(value, fromUnit)
  return fromPoints(pts, toUnit)
}

export function customTemplateToBackendFormat(
  template: CustomTemplateDimensions
): Record<string, number> {
  const u = template.unit
  return {
    page_width: toPoints(template.pageWidth, u),
    page_height: toPoints(template.pageHeight, u),
    labels_per_row: template.columns,
    label_rows: template.rows,
    label_width: toPoints(template.labelWidth, u),
    label_height: toPoints(template.labelHeight, u),
    label_margin_x: 7.2, // 0.1 inch default
    label_margin_y: 7.2,
    left_margin: toPoints(template.marginLeft, u),
    top_margin: toPoints(template.marginTop, u),
    horizontal_gap: toPoints(template.horizontalGap, u),
    vertical_gap: toPoints(template.verticalGap, u),
  }
}
