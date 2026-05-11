import { describe, it, expect } from 'vitest'
import { applyFilters } from '../filtering'
import type { MTGSet, SetFilterPreferences } from '../../types'

function makeSet(overrides: Partial<MTGSet> = {}): MTGSet {
  return {
    id: 'id',
    name: 'Name',
    code: 'CODE',
    set_type: 'expansion',
    card_count: 100,
    released_at: '2024-01-01',
    icon_svg_uri: null,
    scryfall_uri: null,
    ...overrides,
  } as MTGSet
}

const baseline: SetFilterPreferences = {
  activeSetTypes: ['expansion', 'core'],
  ignoredSetCodes: ['cmb1'],
  minimumSetSize: 10,
}

describe('applyFilters', () => {
  it('keeps sets whose type is in activeSetTypes', () => {
    const sets = [makeSet({ id: 'a', set_type: 'expansion' })]
    expect(applyFilters(sets, baseline).map((s) => s.id)).toEqual(['a'])
  })

  it('excludes sets whose type is not in activeSetTypes', () => {
    const sets = [
      makeSet({ id: 'keep', set_type: 'expansion' }),
      makeSet({ id: 'drop', set_type: 'funny' }),
    ]
    expect(applyFilters(sets, baseline).map((s) => s.id)).toEqual(['keep'])
  })

  it('excludes sets whose code is in ignoredSetCodes (case-insensitive)', () => {
    const sets = [
      makeSet({ id: 'keep', code: 'aaa' }),
      makeSet({ id: 'drop-lower', code: 'cmb1' }),
      makeSet({ id: 'drop-upper', code: 'CMB1' }),
    ]
    expect(applyFilters(sets, baseline).map((s) => s.id)).toEqual(['keep'])
  })

  it('excludes sets with card_count below minimumSetSize', () => {
    const sets = [
      makeSet({ id: 'big', card_count: 100 }),
      makeSet({ id: 'small', card_count: 5 }),
      makeSet({ id: 'boundary', card_count: 10 }),
    ]
    expect(applyFilters(sets, baseline).map((s) => s.id)).toEqual(['big', 'boundary'])
  })

  it('returns empty when no sets match', () => {
    const sets = [makeSet({ id: 'drop', set_type: 'funny' })]
    expect(applyFilters(sets, baseline)).toEqual([])
  })

  it('returns empty for empty input', () => {
    expect(applyFilters([], baseline)).toEqual([])
  })
})
