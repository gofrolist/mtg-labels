import { useState, useEffect, useCallback } from 'react'
import type { CustomTemplateDimensions, SelectionState } from '../types'
import { getStorageItem, setStorageItem, isStorageAvailable } from '../utils/localStorage'
import { DEFAULT_TEMPLATE_ID } from '../constants/templates'

const SELECTION_STORAGE_KEY = 'selection-state'

const initialState: SelectionState = {
  selectedSetIds: [],
  quantities: {},
  templateId: DEFAULT_TEMPLATE_ID,
  placeholders: 0,
  customTemplate: null,
  useCustomTemplate: false,
  useCustomQuantity: false,
}

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

  const selectAllSets = useCallback((setIds: string[]) => {
    setSelection((prev) => ({ ...prev, selectedSetIds: setIds }))
  }, [])

  const deselectAllSets = useCallback(() => {
    setSelection((prev) => ({ ...prev, selectedSetIds: [] }))
  }, [])

  const isAllSetsSelected = useCallback((setIds: string[]) => {
    return setIds.length > 0 && setIds.every((id) => selection.selectedSetIds.includes(id))
  }, [selection.selectedSetIds])

  const setCustomTemplate = useCallback((customTemplate: CustomTemplateDimensions | null) => {
    setSelection((prev) => ({ ...prev, customTemplate }))
  }, [])

  const setUseCustomTemplate = useCallback((useCustomTemplate: boolean) => {
    setSelection((prev) => ({ ...prev, useCustomTemplate }))
  }, [])

  const setUseCustomQuantity = useCallback((useCustomQuantity: boolean) => {
    setSelection((prev) => ({ ...prev, useCustomQuantity }))
  }, [])

  return {
    selection,
    toggleSetSelection,
    setQuantity,
    setTemplate,
    setPlaceholders,
    selectAllSets,
    deselectAllSets,
    isAllSetsSelected,
    setCustomTemplate,
    setUseCustomTemplate,
    setUseCustomQuantity,
  }
}
