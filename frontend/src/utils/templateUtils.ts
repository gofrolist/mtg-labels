import type { CustomTemplateDimensions, TemplateMeasurementUnit } from '../types'
import { LABEL_TEMPLATES } from '../constants/templates'
import { fromPoints } from './unitConversion'

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function getPresetUnit(presetId: string): TemplateMeasurementUnit {
  const t = LABEL_TEMPLATES[presetId] ?? LABEL_TEMPLATES.avery5160
  return t.page_width === 595.2 && t.page_height === 841.8 ? 'mm' : 'in'
}

export function snapPageSize(
  width: number,
  height: number,
  unit: TemplateMeasurementUnit,
): { width: number; height: number } {
  if (unit === 'mm' && Math.abs(width - 210) < 0.1 && Math.abs(height - 297) < 0.1) {
    return { width: 210, height: 297 }
  }
  if (unit === 'in' && Math.abs(width - 8.5) < 0.01 && Math.abs(height - 11) < 0.01) {
    return { width: 8.5, height: 11 }
  }
  return { width: round2(width), height: round2(height) }
}

export function presetToCustom(
  presetId: string,
  unit: TemplateMeasurementUnit,
): CustomTemplateDimensions {
  const t = LABEL_TEMPLATES[presetId] ?? LABEL_TEMPLATES.avery5160
  const rawW = fromPoints(t.page_width, unit)
  const rawH = fromPoints(t.page_height, unit)
  const { width: pageWidth, height: pageHeight } = snapPageSize(rawW, rawH, unit)
  return {
    pageWidth,
    pageHeight,
    unit,
    marginLeft: round2(fromPoints(t.left_margin, unit)),
    marginTop: round2(fromPoints(t.top_margin, unit)),
    columns: t.labels_per_row,
    rows: t.label_rows,
    horizontalGap: round2(fromPoints(t.horizontal_gap, unit)),
    verticalGap: round2(fromPoints(t.vertical_gap, unit)),
    labelWidth: round2(fromPoints(t.label_width, unit)),
    labelHeight: round2(fromPoints(t.label_height, unit)),
  }
}
