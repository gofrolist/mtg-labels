import { describe, it, expect } from 'vitest'
import { toPoints, fromPoints, convertValue, customTemplateToBackendFormat } from '../unitConversion'
import type { CustomTemplateDimensions } from '../../types'

describe('toPoints', () => {
  it('converts inches to points', () => {
    expect(toPoints(1, 'in')).toBe(72)
    expect(toPoints(8.5, 'in')).toBeCloseTo(612)
    expect(toPoints(11, 'in')).toBeCloseTo(792)
  })

  it('converts millimeters to points', () => {
    expect(toPoints(25.4, 'mm')).toBeCloseTo(72, 0)
    expect(toPoints(1, 'mm')).toBeCloseTo(2.8346, 3)
  })

  it('converts centimeters to points', () => {
    expect(toPoints(2.54, 'cm')).toBeCloseTo(72, 0)
    expect(toPoints(1, 'cm')).toBeCloseTo(28.3465, 2)
  })
})

describe('fromPoints', () => {
  it('converts points to inches', () => {
    expect(fromPoints(72, 'in')).toBe(1)
    expect(fromPoints(612, 'in')).toBeCloseTo(8.5)
  })

  it('converts points to millimeters', () => {
    expect(fromPoints(72, 'mm')).toBeCloseTo(25.4, 0)
  })

  it('converts points to centimeters', () => {
    expect(fromPoints(72, 'cm')).toBeCloseTo(2.54, 1)
  })
})

describe('convertValue', () => {
  it('returns same value for same unit', () => {
    expect(convertValue(5, 'in', 'in')).toBe(5)
  })

  it('round-trips correctly', () => {
    const original = 8.5
    const inMm = convertValue(original, 'in', 'mm')
    const backToIn = convertValue(inMm, 'mm', 'in')
    expect(backToIn).toBeCloseTo(original, 5)
  })

  it('converts inches to mm', () => {
    expect(convertValue(1, 'in', 'mm')).toBeCloseTo(25.4, 0)
  })

  it('converts mm to cm', () => {
    expect(convertValue(10, 'mm', 'cm')).toBeCloseTo(1, 5)
  })
})

describe('customTemplateToBackendFormat', () => {
  it('converts a custom template with inch units', () => {
    const template: CustomTemplateDimensions = {
      pageWidth: 8.5,
      pageHeight: 11,
      unit: 'in',
      marginLeft: 0.1875,
      marginTop: 0.75,
      columns: 3,
      rows: 10,
      horizontalGap: 0.125,
      verticalGap: 0,
      labelWidth: 2.625,
      labelHeight: 1,
    }

    const result = customTemplateToBackendFormat(template)

    expect(result.page_width).toBeCloseTo(612)
    expect(result.page_height).toBeCloseTo(792)
    expect(result.labels_per_row).toBe(3)
    expect(result.label_rows).toBe(10)
    expect(result.label_width).toBeCloseTo(189)
    expect(result.label_height).toBeCloseTo(72)
    expect(result.label_margin_x).toBe(7.2)
    expect(result.label_margin_y).toBe(7.2)
    expect(result.left_margin).toBeCloseTo(13.5)
    expect(result.top_margin).toBeCloseTo(54)
    expect(result.horizontal_gap).toBeCloseTo(9)
    expect(result.vertical_gap).toBe(0)
  })

  it('converts a custom template with mm units', () => {
    const template: CustomTemplateDimensions = {
      pageWidth: 210,
      pageHeight: 297,
      unit: 'mm',
      marginLeft: 7.25,
      marginTop: 16.18,
      columns: 3,
      rows: 9,
      horizontalGap: 2.5,
      verticalGap: 0,
      labelWidth: 64,
      labelHeight: 30,
    }

    const result = customTemplateToBackendFormat(template)

    expect(result.page_width).toBeCloseTo(595.2, 0)
    expect(result.page_height).toBeCloseTo(841.8, 0)
    expect(result.labels_per_row).toBe(3)
    expect(result.label_rows).toBe(9)
  })
})
