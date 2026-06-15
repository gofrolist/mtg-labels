import { describe, it, expect } from 'vitest'
import { countLabelItems } from '../labelCount'

describe('countLabelItems', () => {
  it('returns the base count when there are no divider letters', () => {
    expect(countLabelItems(['a', 'b', 'c'], {}, false, 0)).toBe(3)
  })

  it('multiplies each selected item by the number of divider letters', () => {
    // 3 sets x 4 letters = 12 labels (mirrors the backend cross-product)
    expect(countLabelItems(['a', 'b', 'c'], {}, false, 4)).toBe(12)
  })

  it('applies per-item custom quantities, then multiplies by letters', () => {
    // (2 + 1 + 1) base x 3 letters = 12
    expect(countLabelItems(['a', 'b', 'c'], { a: 2 }, true, 3)).toBe(12)
  })

  it('ignores quantities when custom quantity is off', () => {
    expect(countLabelItems(['a', 'b'], { a: 50 }, false, 2)).toBe(4)
  })

  it('treats a missing custom quantity as 1', () => {
    expect(countLabelItems(['a', 'b'], {}, true, 1)).toBe(2)
  })
})
