import { describe, it, expect } from 'vitest'
import { round2, snapPageSize, presetToCustom, getPresetUnit } from '../templateUtils'

describe('round2', () => {
  it('rounds to 2 decimal places', () => {
    expect(round2(1.005)).toBe(1)
    expect(round2(1.555)).toBe(1.56)
    expect(round2(2.0)).toBe(2)
  })
})

describe('getPresetUnit', () => {
  it('returns in for US Letter presets', () => {
    expect(getPresetUnit('avery5160')).toBe('in')
  })

  it('returns mm for A4 presets', () => {
    expect(getPresetUnit('averyl7160')).toBe('mm')
  })

  it('defaults to avery5160 for unknown IDs', () => {
    expect(getPresetUnit('nonexistent')).toBe('in')
  })
})

describe('snapPageSize', () => {
  it('snaps near-A4 values', () => {
    expect(snapPageSize(209.99, 297.01, 'mm')).toEqual({ width: 210, height: 297 })
  })

  it('snaps near-letter values', () => {
    expect(snapPageSize(8.499, 10.999, 'in')).toEqual({ width: 8.5, height: 11 })
  })

  it('rounds non-standard values', () => {
    expect(snapPageSize(7.123, 9.456, 'in')).toEqual({ width: 7.12, height: 9.46 })
  })
})

describe('presetToCustom', () => {
  it('converts avery5160 preset to custom dimensions in inches', () => {
    const result = presetToCustom('avery5160', 'in')
    expect(result.pageWidth).toBe(8.5)
    expect(result.pageHeight).toBe(11)
    expect(result.unit).toBe('in')
    expect(result.columns).toBe(3)
    expect(result.rows).toBe(10)
  })

  it('converts A4 preset to custom dimensions in mm', () => {
    const result = presetToCustom('averyl7160', 'mm')
    expect(result.pageWidth).toBe(210)
    expect(result.pageHeight).toBe(297)
    expect(result.unit).toBe('mm')
  })
})
