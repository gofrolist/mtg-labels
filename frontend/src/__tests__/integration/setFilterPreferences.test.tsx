import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSetFilterPreferences } from '../../hooks/useSetFilterPreferences'
import { applyFilters } from '../../utils/filtering'
import { DEFAULT_MINIMUM_SET_SIZE } from '../../constants/setFilterDefaults'
import type { MTGSet } from '../../types'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

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

describe('integration: useSetFilterPreferences + applyFilters', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('removes sets when the user disables their set_type', () => {
    const sets = [
      makeSet({ id: 'a', set_type: 'expansion' }),
      makeSet({ id: 'b', set_type: 'expansion' }),
      makeSet({ id: 'c', set_type: 'core' }),
    ]
    const { result } = renderHook(() => useSetFilterPreferences())
    expect(applyFilters(sets, result.current.preferences).map((s) => s.id)).toEqual([
      'a',
      'b',
      'c',
    ])

    act(() => {
      result.current.setActiveSetTypes(
        result.current.preferences.activeSetTypes.filter((t) => t !== 'expansion'),
      )
    })

    expect(applyFilters(sets, result.current.preferences).map((s) => s.id)).toEqual(['c'])
  })

  it('removes sets when the user adds the code to ignoredSetCodes', () => {
    const sets = [
      makeSet({ id: 'keep', code: 'keep' }),
      makeSet({ id: 'drop', code: 'drop' }),
    ]
    const { result } = renderHook(() => useSetFilterPreferences())
    expect(applyFilters(sets, result.current.preferences).map((s) => s.id)).toEqual([
      'keep',
      'drop',
    ])

    act(() => {
      result.current.setIgnoredSetCodes([
        ...result.current.preferences.ignoredSetCodes,
        'drop',
      ])
    })

    expect(applyFilters(sets, result.current.preferences).map((s) => s.id)).toEqual(['keep'])
  })

  it('removes sets below the user-set minimum size', () => {
    const sets = [makeSet({ id: 'big', card_count: 200 }), makeSet({ id: 'small', card_count: 50 })]
    const { result } = renderHook(() => useSetFilterPreferences())

    act(() => {
      result.current.setMinimumSetSize(100)
    })

    expect(applyFilters(sets, result.current.preferences).map((s) => s.id)).toEqual(['big'])
  })

  it('reset() restores the filtered list to defaults', () => {
    const sets = [makeSet({ id: 'a', set_type: 'expansion', card_count: 100 })]
    const { result } = renderHook(() => useSetFilterPreferences())

    act(() => {
      result.current.setActiveSetTypes([])
      result.current.setMinimumSetSize(999)
    })
    expect(applyFilters(sets, result.current.preferences)).toEqual([])

    act(() => {
      result.current.reset()
    })
    expect(result.current.preferences.minimumSetSize).toBe(DEFAULT_MINIMUM_SET_SIZE)
    expect(applyFilters(sets, result.current.preferences).map((s) => s.id)).toEqual(['a'])
  })
})
