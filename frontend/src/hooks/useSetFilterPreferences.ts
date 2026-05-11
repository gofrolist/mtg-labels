import { useState, useCallback } from 'react'
import type { SetFilterPreferences } from '../types'
import { getStorageItem, setStorageItem } from '../utils/localStorage'
import {
  DEFAULT_SET_TYPES,
  DEFAULT_IGNORED_SET_CODES,
  DEFAULT_MINIMUM_SET_SIZE,
} from '../constants/setFilterDefaults'

const STORAGE_KEY = 'set-filter-preferences'

function buildDefaults(): SetFilterPreferences {
  return {
    activeSetTypes: [...DEFAULT_SET_TYPES],
    ignoredSetCodes: [...DEFAULT_IGNORED_SET_CODES],
    minimumSetSize: DEFAULT_MINIMUM_SET_SIZE,
  }
}

function isValid(value: unknown): value is SetFilterPreferences {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<SetFilterPreferences>
  return (
    Array.isArray(v.activeSetTypes) &&
    v.activeSetTypes.every(t => typeof t === 'string') &&
    Array.isArray(v.ignoredSetCodes) &&
    v.ignoredSetCodes.every(c => typeof c === 'string') &&
    typeof v.minimumSetSize === 'number' &&
    Number.isFinite(v.minimumSetSize)
  )
}

export function useSetFilterPreferences() {
  const [preferences, setPreferences] = useState<SetFilterPreferences>(() => {
    const stored = getStorageItem<unknown>(STORAGE_KEY)
    if (stored === null) return buildDefaults()
    if (!isValid(stored)) {
      console.warn('Invalid set filter preferences in localStorage; using defaults')
      return buildDefaults()
    }
    return stored
  })

  const persist = useCallback((updated: SetFilterPreferences) => {
    setPreferences(updated)
    setStorageItem(STORAGE_KEY, updated)
  }, [])

  const setActiveSetTypes = useCallback(
    (types: string[]) => persist({ ...preferences, activeSetTypes: types }),
    [preferences, persist],
  )

  const setIgnoredSetCodes = useCallback(
    (codes: string[]) => persist({ ...preferences, ignoredSetCodes: codes }),
    [preferences, persist],
  )

  const setMinimumSetSize = useCallback(
    (size: number) => persist({ ...preferences, minimumSetSize: size }),
    [preferences, persist],
  )

  const reset = useCallback(() => {
    persist(buildDefaults())
  }, [persist])

  return {
    preferences,
    setActiveSetTypes,
    setIgnoredSetCodes,
    setMinimumSetSize,
    reset,
  }
}

export type SetFilterPreferencesApi = ReturnType<typeof useSetFilterPreferences>
