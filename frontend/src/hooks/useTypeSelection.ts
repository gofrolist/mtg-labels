import { useState, useEffect, useCallback } from 'react'
import { getStorageItem, setStorageItem, isStorageAvailable } from '../utils/localStorage'

export const TYPE_SELECTION_STORAGE_KEY = 'type-selection-state'

/**
 * Card types picked in the Types tab, as "color:type" ids. Kept separate from
 * the set selection but persisted the same way, so both survive a reload — the
 * Matrix tab crosses the two and would otherwise lose an axis on refresh.
 */
export interface TypeSelectionState {
  selectedTypeIds: string[]
  quantities: Record<string, number> // Map of type ID to quantity (1-100)
}

const initialState: TypeSelectionState = {
  selectedTypeIds: [],
  quantities: {},
}

function isValid(value: unknown): value is TypeSelectionState {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<TypeSelectionState>
  return (
    Array.isArray(v.selectedTypeIds) &&
    v.selectedTypeIds.every(id => typeof id === 'string') &&
    typeof v.quantities === 'object' &&
    v.quantities !== null
  )
}

export function useTypeSelection() {
  const [typeSelection, setTypeSelection] = useState<TypeSelectionState>(() => {
    if (!isStorageAvailable()) return initialState
    const saved = getStorageItem<unknown>(TYPE_SELECTION_STORAGE_KEY)
    if (saved === null) return initialState
    if (!isValid(saved)) {
      console.warn('Invalid type selection in localStorage; starting empty')
      return initialState
    }
    return { ...initialState, ...saved }
  })

  useEffect(() => {
    if (isStorageAvailable()) {
      setStorageItem(TYPE_SELECTION_STORAGE_KEY, typeSelection)
    }
  }, [typeSelection])

  const toggleTypeSelection = useCallback((typeId: string) => {
    setTypeSelection(prev => ({
      ...prev,
      selectedTypeIds: prev.selectedTypeIds.includes(typeId)
        ? prev.selectedTypeIds.filter(id => id !== typeId)
        : [...prev.selectedTypeIds, typeId],
    }))
  }, [])

  const selectTypes = useCallback((typeIds: string[]) => {
    setTypeSelection(prev => ({
      ...prev,
      selectedTypeIds: [...new Set([...prev.selectedTypeIds, ...typeIds])],
    }))
  }, [])

  const deselectTypes = useCallback((typeIds: string[]) => {
    setTypeSelection(prev => {
      const toRemove = new Set(typeIds)
      return {
        ...prev,
        selectedTypeIds: prev.selectedTypeIds.filter(id => !toRemove.has(id)),
      }
    })
  }, [])

  const selectAllTypes = useCallback((typeIds: string[]) => {
    setTypeSelection(prev => ({ ...prev, selectedTypeIds: typeIds }))
  }, [])

  const deselectAllTypes = useCallback(() => {
    setTypeSelection(prev => ({ ...prev, selectedTypeIds: [] }))
  }, [])

  const setTypeQuantity = useCallback((typeId: string, quantity: number) => {
    setTypeSelection(prev => ({
      ...prev,
      quantities: {
        ...prev.quantities,
        [typeId]: Math.max(1, Math.min(100, quantity)),
      },
    }))
  }, [])

  return {
    typeSelection,
    toggleTypeSelection,
    selectTypes,
    deselectTypes,
    selectAllTypes,
    deselectAllTypes,
    setTypeQuantity,
  }
}
