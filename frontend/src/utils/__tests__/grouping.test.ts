import { describe, it, expect } from 'vitest'
import { groupSetsByType, filterSetsByQuery } from '../grouping'
import type { MTGSet } from '../../types'

const mockSets: MTGSet[] = [
  {
    id: '1',
    name: 'Test Set 1',
    code: 'TS1',
    set_type: 'expansion',
    card_count: 100,
    released_at: '2023-01-01',
    icon_svg_uri: null,
    scryfall_uri: null,
  },
  {
    id: '2',
    name: 'Test Set 2',
    code: 'TS2',
    set_type: 'expansion',
    card_count: 200,
    released_at: '2023-02-01',
    icon_svg_uri: null,
    scryfall_uri: null,
  },
  {
    id: '3',
    name: 'Core Set',
    code: 'CS1',
    set_type: 'core',
    card_count: 300,
    released_at: '2023-03-01',
    icon_svg_uri: null,
    scryfall_uri: null,
  },
]

describe('groupSetsByType', () => {
  it('groups sets by type', () => {
    const grouped = groupSetsByType(mockSets)
    expect(grouped.expansion).toHaveLength(2)
    expect(grouped.core).toHaveLength(1)
  })
})

describe('filterSetsByQuery', () => {
  it('filters sets by name', () => {
    const filtered = filterSetsByQuery(mockSets, 'Test')
    expect(filtered).toHaveLength(2)
  })

  it('filters sets by code', () => {
    const filtered = filterSetsByQuery(mockSets, 'TS1')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].code).toBe('TS1')
  })

  it('returns all sets when query is empty', () => {
    const filtered = filterSetsByQuery(mockSets, '')
    expect(filtered).toHaveLength(3)
  })

  it('is case-insensitive', () => {
    const filtered = filterSetsByQuery(mockSets, 'test')
    expect(filtered).toHaveLength(2)
  })
})
