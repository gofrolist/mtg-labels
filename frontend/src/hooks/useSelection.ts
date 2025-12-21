import { useState, useEffect, useCallback } from 'react'
import type { SelectionState } from '../types'
import { getStorageItem, setStorageItem, isStorageAvailable } from '../utils/localStorage'
import { DEFAULT_TEMPLATE_ID } from '../constants/templates'

const SELECTION_STORAGE_KEY = 'selection-state'

const initialState: SelectionState = {
  selectedSetIds: [],
  selectedCardTypeIds: [],
  quantities: {},
  templateId: DEFAULT_TEMPLATE_ID,
  placeholders: 0,
  viewMode: 'sets',
}

/**
 * Custom hook for managing selection state with localStorage persistence.
 */
export function useSelection() {
  const [selection, setSelection] = useState<SelectionState>(() => {
    if (isStorageAvailable()) {
      const saved = getStorageItem<SelectionState>(SELECTION_STORAGE_KEY)
      if (saved) {
        return { ...initialState, ...saved }
      }
    }
    return initialState
  })

  // Persist to localStorage whenever selection changes
  useEffect(() => {
    if (isStorageAvailable()) {
      setStorageItem(SELECTION_STORAGE_KEY, selection)
    }
  }, [selection])

  const toggleSetSelection = useCallback((setId: string) => {
    setSelection((prev) => {
      const isSelected = prev.selectedSetIds.includes(setId)
      return {
        ...prev,
        selectedSetIds: isSelected
          ? prev.selectedSetIds.filter((id) => id !== setId)
          : [...prev.selectedSetIds, setId],
      }
    })
  }, [])

  const toggleCardTypeSelection = useCallback((cardTypeId: string) => {
    setSelection((prev) => {
      const isSelected = prev.selectedCardTypeIds.includes(cardTypeId)
      return {
        ...prev,
        selectedCardTypeIds: isSelected
          ? prev.selectedCardTypeIds.filter((id) => id !== cardTypeId)
          : [...prev.selectedCardTypeIds, cardTypeId],
      }
    })
  }, [])

  const setQuantity = useCallback((itemId: string, quantity: number) => {
    setSelection((prev) => ({
      ...prev,
      quantities: {
        ...prev.quantities,
        [itemId]: Math.max(1, Math.min(100, quantity)),
      },
    }))
  }, [])

  const setTemplate = useCallback((templateId: string) => {
    setSelection((prev) => ({ ...prev, templateId }))
  }, [])

  const setPlaceholders = useCallback((placeholders: number) => {
    setSelection((prev) => ({ ...prev, placeholders: Math.max(0, placeholders) }))
  }, [])

  const setViewMode = useCallback((viewMode: 'sets' | 'types') => {
    setSelection((prev) => ({ ...prev, viewMode }))
  }, [])

  const selectAllSets = useCallback((setIds: string[]) => {
    setSelection((prev) => ({
      ...prev,
      selectedSetIds: setIds,
    }))
  }, [])

  const deselectAllSets = useCallback(() => {
    setSelection((prev) => ({
      ...prev,
      selectedSetIds: [],
    }))
  }, [])

  const selectAllCardTypes = useCallback((cardTypeIds: string[]) => {
    setSelection((prev) => ({
      ...prev,
      selectedCardTypeIds: cardTypeIds,
    }))
  }, [])

  const deselectAllCardTypes = useCallback(() => {
    setSelection((prev) => ({
      ...prev,
      selectedCardTypeIds: [],
    }))
  }, [])

  const isAllSetsSelected = useCallback((setIds: string[]) => {
    return setIds.length > 0 && setIds.every((id) => selection.selectedSetIds.includes(id))
  }, [selection.selectedSetIds])

  return {
    selection,
    toggleSetSelection,
    toggleCardTypeSelection,
    setQuantity,
    setTemplate,
    setPlaceholders,
    setViewMode,
    selectAllSets,
    deselectAllSets,
    selectAllCardTypes,
    deselectAllCardTypes,
    isAllSetsSelected,
  }
}
