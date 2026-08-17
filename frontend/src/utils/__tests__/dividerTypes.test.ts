import { describe, it, expect } from 'vitest'
import { formatDividerTypeLabel, splitDividerTypeId, sortDividerTypeIds } from '../dividerTypes'

const GROUPED_TYPES = {
  White: ['Creature', 'Instant'],
  Blue: ['Creature', 'Sorcery'],
}

describe('splitDividerTypeId', () => {
  it('splits a color:type id', () => {
    expect(splitDividerTypeId('White:Creature')).toEqual({ color: 'White', type: 'Creature' })
  })

  it('keeps a multiword type intact', () => {
    expect(splitDividerTypeId('Colorless:Artifact Creature')).toEqual({
      color: 'Colorless',
      type: 'Artifact Creature',
    })
  })

  it('returns null without a separator', () => {
    expect(splitDividerTypeId('Creature')).toBeNull()
  })

  it('returns null when a side is empty', () => {
    expect(splitDividerTypeId(':Creature')).toBeNull()
    expect(splitDividerTypeId('White:')).toBeNull()
  })
})

describe('formatDividerTypeLabel', () => {
  it('renders the printed label form', () => {
    expect(formatDividerTypeLabel('White:Creature')).toBe('White - Creature')
  })

  it('falls back to the raw id when unparseable', () => {
    expect(formatDividerTypeLabel('Creature')).toBe('Creature')
  })
})

describe('sortDividerTypeIds', () => {
  it('orders ids by the picker layout, not the tick order', () => {
    expect(
      sortDividerTypeIds(['Blue:Sorcery', 'White:Instant', 'White:Creature'], GROUPED_TYPES)
    ).toEqual(['White:Creature', 'White:Instant', 'Blue:Sorcery'])
  })

  it('puts unknown ids last', () => {
    expect(sortDividerTypeIds(['Green:Land', 'White:Instant'], GROUPED_TYPES)).toEqual([
      'White:Instant',
      'Green:Land',
    ])
  })

  it('does not mutate the input', () => {
    const ids = ['Blue:Sorcery', 'White:Creature']
    sortDividerTypeIds(ids, GROUPED_TYPES)
    expect(ids).toEqual(['Blue:Sorcery', 'White:Creature'])
  })
})
