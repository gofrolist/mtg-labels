import { useState, useCallback } from 'react'
import type { LabelLayout, SavedCustomLayout } from '../types'
import { getStorageItem, setStorageItem } from '../utils/localStorage'
import { DEFAULT_LABEL_LAYOUTS, DEFAULT_LAYOUT_ID } from '../constants/labelLayouts'

const STORAGE_KEY = 'custom-layouts'
const SELECTED_LAYOUT_KEY = 'selected-layout-id'

interface LayoutStorageData {
  layouts: SavedCustomLayout[]
}

export function useCustomLayouts() {
  const [customLayouts, setCustomLayouts] = useState<SavedCustomLayout[]>(() => {
    const data = getStorageItem<LayoutStorageData>(STORAGE_KEY)
    return data?.layouts ?? []
  })

  const [selectedLayoutId, setSelectedLayoutIdState] = useState<string>(() => {
    return getStorageItem<string>(SELECTED_LAYOUT_KEY) ?? DEFAULT_LAYOUT_ID
  })

  const persistLayouts = (updated: SavedCustomLayout[]) => {
    setCustomLayouts(updated)
    setStorageItem(STORAGE_KEY, { layouts: updated })
  }

  const setSelectedLayoutId = useCallback((id: string) => {
    setSelectedLayoutIdState(id)
    setStorageItem(SELECTED_LAYOUT_KEY, id)
  }, [])

  // Get the currently selected layout (either default or custom)
  const getSelectedLayout = useCallback((): LabelLayout => {
    // Check if it's a default layout
    if (DEFAULT_LABEL_LAYOUTS[selectedLayoutId]) {
      return DEFAULT_LABEL_LAYOUTS[selectedLayoutId]
    }
    // Check if it's a custom layout
    const custom = customLayouts.find(l => l.id === selectedLayoutId)
    if (custom) {
      return {
        id: custom.id,
        name: custom.name,
        isDefault: false,
        ...custom.layout,
      }
    }
    // Fallback to default
    return DEFAULT_LABEL_LAYOUTS[DEFAULT_LAYOUT_ID]
  }, [selectedLayoutId, customLayouts])

  // Get all layouts (default + custom) for dropdown
  const getAllLayouts = useCallback((): LabelLayout[] => {
    const defaults = Object.values(DEFAULT_LABEL_LAYOUTS)
    const customs = customLayouts.map(c => ({
      id: c.id,
      name: c.name,
      isDefault: false,
      ...c.layout,
    }))
    return [...defaults, ...customs]
  }, [customLayouts])

  // Save a new custom layout
  const saveLayout = useCallback(
    (name: string, layout: Omit<LabelLayout, 'id' | 'name' | 'isDefault'>): SavedCustomLayout => {
      const newLayout: SavedCustomLayout = {
        id: crypto.randomUUID(),
        name,
        layout,
      }
      persistLayouts([...customLayouts, newLayout])
      setSelectedLayoutId(newLayout.id)
      return newLayout
    },
    [customLayouts, setSelectedLayoutId],
  )

  // Update an existing custom layout
  const updateLayout = useCallback(
    (id: string, layout: Omit<LabelLayout, 'id' | 'name' | 'isDefault'>) => {
      persistLayouts(
        customLayouts.map(l => (l.id === id ? { ...l, layout } : l)),
      )
    },
    [customLayouts],
  )

  // Rename a custom layout
  const renameLayout = useCallback(
    (id: string, name: string) => {
      persistLayouts(
        customLayouts.map(l => (l.id === id ? { ...l, name } : l)),
      )
    },
    [customLayouts],
  )

  // Delete a custom layout
  const deleteLayout = useCallback(
    (id: string) => {
      persistLayouts(customLayouts.filter(l => l.id !== id))
      // If deleted layout was selected, switch to default
      if (selectedLayoutId === id) {
        setSelectedLayoutId(DEFAULT_LAYOUT_ID)
      }
    },
    [customLayouts, selectedLayoutId, setSelectedLayoutId],
  )

  // Check if a layout can be edited (only custom layouts can be edited)
  const isLayoutEditable = useCallback(
    (id: string): boolean => {
      return customLayouts.some(l => l.id === id)
    },
    [customLayouts],
  )

  return {
    customLayouts,
    selectedLayoutId,
    setSelectedLayoutId,
    getSelectedLayout,
    getAllLayouts,
    saveLayout,
    updateLayout,
    renameLayout,
    deleteLayout,
    isLayoutEditable,
  }
}

export type CustomLayoutsApi = ReturnType<typeof useCustomLayouts>
