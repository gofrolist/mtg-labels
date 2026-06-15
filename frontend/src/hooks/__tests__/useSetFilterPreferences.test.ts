import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSetFilterPreferences, STORAGE_KEY as RAW_KEY } from '../useSetFilterPreferences'
import { STORAGE_PREFIX } from '../../utils/localStorage'
import {
  DEFAULT_SET_TYPES,
  DEFAULT_IGNORED_SET_CODES,
  DEFAULT_MINIMUM_SET_SIZE,
} from '../../constants/setFilterDefaults'

// Compose the full on-disk key so the test cannot drift from the hook.
const STORAGE_KEY = `${STORAGE_PREFIX}${RAW_KEY}`

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

describe('useSetFilterPreferences', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.restoreAllMocks()
  })

  it('returns defaults when localStorage is empty', () => {
    const { result } = renderHook(() => useSetFilterPreferences())
    expect(result.current.preferences.activeSetTypes).toEqual([...DEFAULT_SET_TYPES])
    expect(result.current.preferences.ignoredSetCodes).toEqual([...DEFAULT_IGNORED_SET_CODES])
    expect(result.current.preferences.minimumSetSize).toBe(DEFAULT_MINIMUM_SET_SIZE)
  })

  it('persists active set types', () => {
    const { result } = renderHook(() => useSetFilterPreferences())
    act(() => {
      result.current.setActiveSetTypes(['core'])
    })
    expect(result.current.preferences.activeSetTypes).toEqual(['core'])
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY)!)
    expect(stored.activeSetTypes).toEqual(['core'])
  })

  it('persists ignored set codes', () => {
    const { result } = renderHook(() => useSetFilterPreferences())
    act(() => {
      result.current.setIgnoredSetCodes(['custom'])
    })
    expect(result.current.preferences.ignoredSetCodes).toEqual(['custom'])
  })

  it('persists minimum set size', () => {
    const { result } = renderHook(() => useSetFilterPreferences())
    act(() => {
      result.current.setMinimumSetSize(42)
    })
    expect(result.current.preferences.minimumSetSize).toBe(42)
  })

  it('reads previously stored preferences on mount', () => {
    localStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeSetTypes: ['core'],
        ignoredSetCodes: ['xyz'],
        minimumSetSize: 5,
      })
    )
    const { result } = renderHook(() => useSetFilterPreferences())
    expect(result.current.preferences).toEqual({
      activeSetTypes: ['core'],
      ignoredSetCodes: ['xyz'],
      minimumSetSize: 5,
    })
  })

  it('falls back to defaults when stored value is malformed', () => {
    localStorageMock.setItem(STORAGE_KEY, '{not valid json')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useSetFilterPreferences())
    expect(result.current.preferences.activeSetTypes).toEqual([...DEFAULT_SET_TYPES])
    expect(warnSpy).toHaveBeenCalled()
  })

  it('falls back to defaults when stored value has the wrong shape', () => {
    // Valid JSON but missing/incorrectly-typed fields — exercises the hook's
    // own isValid() branch (distinct from the JSON parse error path).
    localStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify({ activeSetTypes: 'not-an-array', minimumSetSize: 'oops' })
    )
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useSetFilterPreferences())
    expect(result.current.preferences.activeSetTypes).toEqual([...DEFAULT_SET_TYPES])
    expect(result.current.preferences.minimumSetSize).toBe(DEFAULT_MINIMUM_SET_SIZE)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid set filter preferences in localStorage')
    )
  })

  it('reset() restores defaults', () => {
    const { result } = renderHook(() => useSetFilterPreferences())
    act(() => {
      result.current.setActiveSetTypes(['core'])
      result.current.setMinimumSetSize(99)
    })
    act(() => {
      result.current.reset()
    })
    expect(result.current.preferences.activeSetTypes).toEqual([...DEFAULT_SET_TYPES])
    expect(result.current.preferences.minimumSetSize).toBe(DEFAULT_MINIMUM_SET_SIZE)
  })
})
